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

function indent(code) {
	lines = code.split('\n');
	for (var i = 0; i < lines.length; i++) {
		if (lines[i] !== '') {
			lines[i] = '\t' + lines[i];
		}
	}
	return lines.join('\n');
}

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

function compileBlock(block, parentContext, returnBlockStatement) {
	var i, j;
	assert.equal('Block', block.type);

	var context = parentContext.copy();

	var declarationList = block.params[0];
	var statementList = block.params[1];

	var statementListOut = [];

	var variableDeclaratorsOut = [];

	assert(Array.isArray(declarationList));
	for (i = 0; i < declarationList.length; i++) {
		var declaration = declarationList[i];
		assert.equal('Declaration', declaration.type);
		
		var declarationSpecifiers = declaration.params[0];
		var initDeclaratorList = declaration.params[1];

		var declarationType = types.getTypeFromDeclarationSpecifiers(declarationSpecifiers);

		assert(Array.isArray(initDeclaratorList));
		for (j = 0; j < initDeclaratorList.length; j++) {
			var initDeclarator = initDeclaratorList[j];
			assert.equal('InitDeclarator', initDeclarator.type);

			var declarator = initDeclarator.params[0];
			var initialValue = initDeclarator.params[1];

			assert.equal('Identifier', declarator.type);
			var identifier = declarator.params[0];

			context.variableTypes[identifier] = declarationType;

			if (initialValue === null) {
				/* declaration does not provide an initial value */
				if (types.equal(declarationType, types.int)) {
					variableDeclaratorsOut.push(estree.VariableDeclarator(
						estree.Identifier(identifier),
						estree.Literal(0)
					));
				} else {
					throw "Unsupported declaration type: " + util.inspect(declarationType);
				}
			} else {
				var initialValueExpr = new Expression(initialValue, context);
				assert(initialValueExpr.isConstant);
				assert(types.equal(declarationType, initialValueExpr.type));

				if (types.equal(declarationType, types.int)) {
					variableDeclaratorsOut.push(estree.VariableDeclarator(
						estree.Identifier(identifier),
						initialValueExpr.compile()
					));
				} else {
					throw "Unsupported declaration type: " + util.inspect(declarationType);
				}
			}
		}
	}

	if (variableDeclaratorsOut.length) {
		statementListOut.push(estree.VariableDeclaration(variableDeclaratorsOut));
	}

	assert(Array.isArray(statementList));

	for (i = 0; i < statementList.length; i++) {
		statementListOut.push(compileStatement(statementList[i], context));
	}

	if (returnBlockStatement) {
		return estree.BlockStatement(statementListOut);
	} else {
		return statementListOut;
	}
}

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

	functionBody = functionBody.concat(compileBlock(this.body, context, false));

	return estree.FunctionDeclaration(
		estree.Identifier(this.name),
		paramIdentifiers,
		estree.BlockStatement(functionBody)
	);
};

function compileModule(name, ast) {
	assert(Array.isArray(ast),
		util.format('compileModule expected an array, got %s', util.inspect(ast))
	);

	var i, fd;
	var functionDefinitions = [];
	var context = new Context(null, {});

	var moduleBody = [
		estree.ExpressionStatement(estree.Literal("use asm"))
	];

	for (i = 0; i < ast.length; i++) {
		switch (ast[i].type) {
			case 'FunctionDefinition':
				fd = new FunctionDefinition(ast[i]);
				functionDefinitions.push(fd);
				context.variableTypes[fd.name] = fd.type;
				break;
			default:
				throw "Unexpected node type: " + ast[i].type;
		}
	}

	for (i = 0; i < functionDefinitions.length; i++) {
		fd = functionDefinitions[i];
		moduleBody.push(fd.compile(context));
	}

	var exportsTable = [];
	for (i = 0; i < functionDefinitions.length; i++) {
		fd = functionDefinitions[i];
		exportsTable.push(estree.Property(
			estree.Identifier(fd.name),
			estree.Identifier(fd.name),
			'init'
		));
	}

	moduleBody.push(estree.ReturnStatement(
		estree.ObjectExpression(exportsTable)
	));

	return estree.Program([
		estree.FunctionDeclaration(
			estree.Identifier(name),
			[],
			estree.BlockStatement(moduleBody)
		)
	]);
}

exports.compileModule = compileModule;
