var assert = require('assert');
var util = require('util');
var types = require('./types');
var estree = require('./estree');

function Context(returnType, variableTypes) {
	this.returnType = returnType;
	this.variableTypes = variableTypes;
}
Context.prototype.copy = function() {
	var variableTypes = {};
	for (var prop in this.variableTypes) {
		variableTypes[prop] = this.variableTypes[prop];
	}
	return new Context(this.returnType, variableTypes);
};

function Expression(node, context) {
	var left, right;
	switch (node.type) {
		case 'Add':
			left = new Expression(node.params[0], context);
			right = new Expression(node.params[1], context);
			assert(types.equal(left.type, right.type));
			this.type = left.type;
			this.compile = function() {
				return estree.BinaryExpression('+', left.compile(), right.compile());
			};
			break;
		case 'Assign':
			left = new Expression(node.params[0], context);
			assert(left.isAssignable);

			var operator = node.params[1];
			assert.equal('=', operator,
				"Assignment operators other than '=' are not yet implemented"
			);

			right = new Expression(node.params[2], context);
			assert(types.equal(left.type, right.type));

			this.type = left.type;

			this.compile = function() {
				return estree.AssignmentExpression('=', left.compile(), right.compile());
			};
			break;
		case 'Const':
			var numString = node.params[0];
			this.isConstant = true;
			if (numString.match(/^\d+$/)) {
				this.type = types.int;
				this.compile = function() {
					return estree.Literal(parseInt(numString, 10));
				};
			} else {
				throw("Unsupported numeric constant: " + numString);
			}
			break;
		case 'FunctionCall':
			var callee = new Expression(node.params[0], context);
			assert.equal('function', callee.type.category);
			this.type = callee.type.returnType;
			var paramTypes = callee.type.paramTypes;

			var argNodes = node.params[1];
			assert(Array.isArray(argNodes));
			var args = [];
			for (var i = 0; i < argNodes.length; i++) {
				args[i] = new Expression(argNodes[i], context);
				assert(types.equal(paramTypes[i], args[i].type));
			}

			this.compile = function() {
				var compiledArgs = [];
				for (var i = 0; i < args.length; i++) {
					compiledArgs[i] = args[i].compile();
				}
				return estree.CallExpression(callee.compile(), compiledArgs);
			};
			break;
		case 'Var':
			var identifier = node.params[0];
			assert(identifier in context.variableTypes, "Undefined variable: " + identifier);

			this.type = context.variableTypes[identifier];
			this.isAssignable = true;
			this.compile = function() {
				return estree.Identifier(identifier);
			};
			break;
		default:
			throw("Unimplemented expression type: " + node.type);
	}
}

function parameterListIsVoid(parameterList) {
	if (parameterList.length != 1) return false;
	var parameter = parameterList[0];
	if (parameter.type != 'TypeOnlyParameterDeclaration') return false;
	var parameterTypeSpecifiers = parameter.params[0];
	if (!types.equal(
		types.getTypeFromDeclarationSpecifiers(parameterTypeSpecifiers),
		types.void
	)) {
		return false;
	}

	return true;
}

function compileReturnExpression(node, context) {
	var expr = new Expression(node, context);
	assert(types.equal(expr.type, context.returnType));

	if (expr.isConstant && types.equal(expr.type, types.int)) {
		/* no type annotation necessary - just return the literal */
		return expr.compile();
	} else {
		switch (expr.type.category) {
			case 'int':
				/* expr|0 */
				return estree.BinaryExpression('|',
					expr.compile(),
					estree.Literal(0)
				);
			default:
				throw("Unimplemented return type: " + utils.inspect(expr.type));
		}
	}
}

function compileStatement(statement, context) {
	switch (statement.type) {
		case 'ExpressionStatement':
			var expr = new Expression(statement.params[0], context);
			return estree.ExpressionStatement(expr.compile());
		case 'Return':
			var returnValue = statement.params[0];
			return estree.ReturnStatement(compileReturnExpression(returnValue, context));
		default:
			throw("Unsupported statement type: " + statement.type);
	}
}

function VariableDeclarator(node, varType, context) {
	assert.equal('InitDeclarator', node.type);

	var declarator = node.params[0];
	assert.equal('Identifier', declarator.type,
		"Variable declarators other than direct identifiers are not implemented yet");
	this.identifier = declarator.params[0];

	this.type = varType;

	if (node.params[1] === null) {
		/* no initial value provided */
		this.initialValue = null;
	} else {
		this.initialValue = new Expression(node.params[1], context);
		assert(this.initialValue.isConstant, "Non-constant initialisers for variables are not supported");
		assert(types.equal(this.type, this.initialValue.type));
	}
}
VariableDeclarator.prototype.compileAsDeclarator = function(out) {
	/*
	Append zero or more VariableDeclarator nodes to 'out' which implement
	the declaration, but not initial value assignment, for this variable. For example:
	int i = 42;
	will produce the declarator 'i = 0'.
	*/
	if (types.equal(this.type, types.int)) {
		out.push(estree.VariableDeclarator(
			estree.Identifier(this.identifier),
			estree.Literal(0)
		));
	} else {
		throw "Unsupported declaration type: " + util.inspect(this.type);
	}
};
VariableDeclarator.prototype.compileAsInitDeclarator = function(out) {
	/*
	Append zero or more VariableDeclarator nodes to 'out' which implement
	both the declaration and initial value assignment for this variable. For example:
	int i = 42;
	will produce the declarator 'i = 42'.
	*/
	if (this.initialValue === null) {
		/* no initial value passed; just output the declarator */
		this.compileAsDeclarator(out);
	} else {
		out.push(estree.VariableDeclarator(
			estree.Identifier(this.identifier),
			this.initialValue.compile()
		));
	}
};
VariableDeclarator.prototype.compileAsInitializer = function(out) {
	/*
	Append zero or more Statement nodes to 'out' which implement
	initial value assignment for this variable. For example:
	int i = 42;
	will produce the statement 'i = 42;'.
	*/
	if (this.initialValue === null) {
		/* no initialization to do */
	} else {
		out.push(estree.ExpressionStatement(
			estree.AssignmentExpression('=',
				estree.Identifier(this.identifier),
				this.initialValue.compile()
			)
		));
	}
};

function BlockStatement(block, parentContext) {
	var i, j;
	assert.equal('Block', block.type);

	this.context = parentContext.copy();

	var declarationList = block.params[0];
	this.statementList = block.params[1];
	assert(Array.isArray(this.statementList));

	this.variableDeclarators = [];

	assert(Array.isArray(declarationList));
	for (i = 0; i < declarationList.length; i++) {
		var declaration = declarationList[i];
		assert.equal('Declaration', declaration.type);
		
		var declarationSpecifiers = declaration.params[0];
		var initDeclaratorList = declaration.params[1];

		var declarationType = types.getTypeFromDeclarationSpecifiers(declarationSpecifiers);

		assert(Array.isArray(initDeclaratorList));
		for (j = 0; j < initDeclaratorList.length; j++) {
			var declarator = new VariableDeclarator(initDeclaratorList[j], declarationType);

			this.context.variableTypes[declarator.identifier] = declarationType;
			this.variableDeclarators.push(declarator);
		}
	}
}
BlockStatement.prototype.compileStatementList = function(includeDeclarators) {
	var statementListOut = [];
	var i;

	if (includeDeclarators) {
		var declaratorList = [];
		for (i = 0; i < this.variableDeclarators.length; i++) {
			this.variableDeclarators[i].compileAsInitDeclarator(declaratorList);
		}
		if (declaratorList.length) {
			statementListOut.push(estree.VariableDeclaration(declaratorList));
		}
	} else {
		for (i = 0; i < this.variableDeclarators.length; i++) {
			this.variableDeclarators[i].compileAsInitializer(statementListOut);
		}
	}

	for (i = 0; i < this.statementList.length; i++) {
		statementListOut.push(compileStatement(this.statementList[i], this.context));
	}

	return statementListOut;
};
BlockStatement.prototype.compile = function(includeDeclarators) {
	return estree.BlockStatement(this.compileStatementList(includeDeclarators));
};

function FunctionDefinition(node) {
	assert.equal('FunctionDefinition', node.type);
	var declarationSpecifiers = node.params[0];
	var declarator = node.params[1];
	var declarationList = node.params[2];
	this.body = node.params[3];

	this.returnType = types.getTypeFromDeclarationSpecifiers(declarationSpecifiers);

	assert.equal('FunctionDeclarator', declarator.type);
	var nameDeclarator = declarator.params[0];
	var parameterList = declarator.params[1];

	assert.equal('Identifier', nameDeclarator.type);
	this.name = nameDeclarator.params[0];

	assert(Array.isArray(parameterList));
	this.parameters = [];
	var parameterTypes = [];

	if (!parameterListIsVoid(parameterList)) {
		for (var i = 0; i < parameterList.length; i++) {
			var parameterDeclaration = parameterList[i];
			assert.equal('ParameterDeclaration', parameterDeclaration.type);

			var parameterType = types.getTypeFromDeclarationSpecifiers(parameterDeclaration.params[0]);
			parameterTypes.push(parameterType);

			var parameterIdentifier = parameterDeclaration.params[1];
			assert.equal('Identifier', parameterIdentifier.type);
			var ident = parameterIdentifier.params[0];

			this.parameters.push({
				'identifier': ident,
				'type': parameterType
			});
		}
	}
	this.type = types.func(this.returnType, parameterTypes);

	assert(Array.isArray(declarationList));
	assert.equal(0, declarationList.length);
}
FunctionDefinition.prototype.compile = function(parentContext) {
	var context = parentContext.copy();
	context.returnType = this.returnType;

	var paramIdentifiers = [];
	var functionBody = [];

	for (var i = 0; i < this.parameters.length; i++) {
		var param = this.parameters[i];
		context.variableTypes[param.identifier] = param.type;
		paramIdentifiers.push(estree.Identifier(param.identifier));

		/* add parameter type annotation to function body */
		switch(param.type.category) {
			case 'int':
				/* x = x|0; */
				functionBody.push(estree.ExpressionStatement(
					estree.AssignmentExpression('=',
						estree.Identifier(param.identifier),
						estree.BinaryExpression('|',
							estree.Identifier(param.identifier),
							estree.Literal(0)
						)
					)
				));
				break;
			default:
				throw "Parameter type annotation not yet implemented: " + util.inspect(param.type);
		}
	}

	var blockStatement = new BlockStatement(this.body, context);
	functionBody = functionBody.concat(blockStatement.compileStatementList(true));

	return estree.FunctionDeclaration(
		estree.Identifier(this.name),
		paramIdentifiers,
		estree.BlockStatement(functionBody)
	);
};

function Module(name, declarationNodes) {
	this.name = name;

	assert(Array.isArray(declarationNodes),
		util.format('Module expected an array, got %s', util.inspect(declarationNodes))
	);

	this.functionDefinitions = [];
	this.context = new Context(null, {});

	for (var i = 0; i < declarationNodes.length; i++) {
		var node = declarationNodes[i];

		switch (node.type) {
			case 'FunctionDefinition':
				var fd = new FunctionDefinition(node);
				this.functionDefinitions.push(fd);
				this.context.variableTypes[fd.name] = fd.type;
				break;
			default:
				throw "Unexpected node type: " + node.type;
		}
	}
}
Module.prototype.compileExportsTable = function() {
	var exportsTable = [];
	for (i = 0; i < this.functionDefinitions.length; i++) {
		var fd = this.functionDefinitions[i];

		exportsTable.push(estree.Property(
			estree.Identifier(fd.name),
			estree.Identifier(fd.name),
			'init'
		));
	}

	return estree.ObjectExpression(exportsTable);
};
Module.prototype.compile = function() {
	var moduleBody = [
		estree.ExpressionStatement(estree.Literal("use asm"))
	];

	for (var i = 0; i < this.functionDefinitions.length; i++) {
		var fd = this.functionDefinitions[i];
		moduleBody.push(fd.compile(this.context));
	}

	moduleBody.push(estree.ReturnStatement(
		this.compileExportsTable()
	));

	return estree.Program([
		estree.FunctionDeclaration(
			estree.Identifier(this.name),
			[],
			estree.BlockStatement(moduleBody)
		)
	]);
};

exports.Module = Module;
