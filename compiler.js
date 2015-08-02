var assert = require('assert');
var util = require('util');
var types = require('./types');
var expressions = require('./expressions');
var estree = require('./estree');

function Context(parentContext) {
	this.variables = {};
	this.parentContext = parentContext;
	this.allocatedJSIdentifiers = {};
}
Context.prototype.getVariable = function(identifier) {
	if (identifier in this.variables) {
		return this.variables[identifier];
	} else if (this.parentContext !== null) {
		return this.parentContext.getVariable(identifier);
	}
};
Context.prototype.allocateVariable = function(identifier, declaredType, intendedType) {
	var jsIdentifier = identifier;
	var i = 0;
	while (jsIdentifier in this.allocatedJSIdentifiers) {
		jsIdentifier = identifier + '_' + i;
		i++;
	}
	this.allocatedJSIdentifiers[jsIdentifier] = true;

	var variable = {
		'type': declaredType,
		'intendedType': intendedType,
		'jsIdentifier': jsIdentifier
	};
	this.variables[identifier] = variable;
	return variable;
};
Context.prototype.createChildContext = function() {
	var context = new Context(this);
	context.returnType = this.returnType;
	context.allocatedJSIdentifiers = this.allocatedJSIdentifiers;
	return context;
};
Context.prototype.createFunctionContext = function(returnType) {
	var context = new Context(this);
	context.returnType = returnType;
	return context;
};


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

function ExpressionStatement(node, context) {
	this.context = context;
	this.expressionNode = node.params[0];
	/* do not construct an Expression object yet, as that may perform lookups
		in the context for identifiers that are defined further down the file */
}
ExpressionStatement.prototype.compileDeclarators = function(out) {
	/* an ExpressionStatement does not contain variable declarations */
};
ExpressionStatement.prototype.compile = function(out) {
	var expr = new expressions.Expression(this.expressionNode, this.context, false);
	out.push(estree.ExpressionStatement(expr.compile()));
};

function ForStatement(node, context) {
	this.context = context;

	var initExpressionStatementNode = node.params[0];
	assert.equal('ExpressionStatement', initExpressionStatementNode.type);
	this.initExpressionNode = initExpressionStatementNode.params[0];

	var testExpressionStatementNode = node.params[1];
	assert.equal('ExpressionStatement', testExpressionStatementNode.type);
	this.testExpressionNode = testExpressionStatementNode.params[0];

	this.updateExpressionNode = node.params[2];

	this.body = buildStatement(node.params[3], this.context);
}
ForStatement.prototype.compileDeclarators = function(out) {
	this.body.compileDeclarators(out);
};
ForStatement.prototype.compile = function(out) {
	var init = new expressions.Expression(this.initExpressionNode, this.context, false);
	var test = new expressions.Expression(this.testExpressionNode, this.context, true);
	var update = new expressions.Expression(this.updateExpressionNode, this.context, false);

	var bodyStatements = [];
	this.body.compile(bodyStatements);
	assert.equal(1, bodyStatements.length);
	var bodyStatement = bodyStatements[0];

	out.push(estree.ForStatement(
		init.compile(),
		expressions.coerce(test, types.int),
		update.compile(),
		bodyStatement
	));
};

function IfStatement(node, context) {
	this.context = context;

	this.testExpressionNode = node.params[0];
	this.thenStatement = buildStatement(node.params[1], this.context);
	if (node.params[2] === null) {
		this.elseStatement = null;
	} else {
		this.elseStatement = buildStatement(node.params[2], this.context);
	}
}
IfStatement.prototype.compileDeclarators = function(out) {
	this.thenStatement.compileDeclarators(out);
	if (this.elseStatement !== null) {
		this.elseStatement.compileDeclarators(out);
	}
};
IfStatement.prototype.compile = function(out) {
	var test = new expressions.Expression(this.testExpressionNode, this.context, true);
	assert(types.equal(types.int, test.type));

	var thenBodyStatements = [];
	this.thenStatement.compile(thenBodyStatements);
	assert.equal(1, thenBodyStatements.length);
	var thenStatementNode = thenBodyStatements[0];

	var elseStatementNode = null;
	if (this.elseStatement !== null) {
		var elseBodyStatements = [];
		this.elseStatement.compile(elseBodyStatements);
		assert.equal(1, elseBodyStatements.length);
		elseStatementNode = elseBodyStatements[0];
	}

	out.push(estree.IfStatement(
		test.compile(),
		thenStatementNode,
		elseStatementNode
	));
};

function ReturnStatement(node, context) {
	this.context = context;
	this.expressionNode = node.params[0];
	/* do not construct an Expression object yet, as that may perform lookups
		in the context for identifiers that are defined further down the file */
}
ReturnStatement.prototype.compileDeclarators = function(out) {
	/* a ReturnStatement does not contain variable declarations */
};
ReturnStatement.prototype.compile = function(out) {
	var expr = new expressions.Expression(this.expressionNode, this.context, true);
	var returnValueNode;

	switch(this.context.returnType.category) {
		case 'signed':
			if (expr.isConstant && types.satisfies(expr.type, types.signed)) {
				/* no type annotation necessary - just return the literal */
				returnValueNode = expr.compile();
			} else if (types.satisfies(expr.type, types.intish)) {
				/* expr|0 */
				returnValueNode = estree.BinaryExpression('|',
					expr.compile(),
					estree.Literal(0)
				);
			} else {
				throw util.format("Cannot convert %s to a return type of 'signed'", util.inspect(expr.type));
			}
			break;
		default:
			throw("Unimplemented return type: " + util.inspect(expr.type));
	}

	if (expr.isConstant && types.satisfies(expr.type, types.signed)) {
	} else {
		switch (expr.type.category) {
			case 'int':
		}
	}

	out.push(estree.ReturnStatement(returnValueNode));
};

function WhileStatement(node, context) {
	this.context = context;
	this.expressionNode = node.params[0];
	this.body = buildStatement(node.params[1], this.context);
}
WhileStatement.prototype.compileDeclarators = function(out) {
	this.body.compileDeclarators(out);
};
WhileStatement.prototype.compile = function(out) {
	var test = new expressions.Expression(this.expressionNode, this.context, true);

	var bodyStatements = [];
	this.body.compile(bodyStatements);
	assert.equal(1, bodyStatements.length);
	var bodyStatement = bodyStatements[0];

	out.push(estree.WhileStatement(expressions.coerce(test, types.int), bodyStatement));
};

function buildStatement(statementNode, context) {
	switch (statementNode.type) {
		case 'Block':
			return new BlockStatement(statementNode, context);
		case 'ExpressionStatement':
			return new ExpressionStatement(statementNode, context);
		case 'For':
			return new ForStatement(statementNode, context);
		case 'If':
			return new IfStatement(statementNode, context);
		case 'Return':
			return new ReturnStatement(statementNode, context);
		case 'While':
			return new WhileStatement(statementNode, context);
		default:
			throw("Unsupported statement type: " + statementNode.type);
	}
}

function VariableDeclarator(node, varType, context) {
	assert.equal('InitDeclarator', node.type);

	var declarator = node.params[0];
	assert.equal('Identifier', declarator.type,
		"Variable declarators other than direct identifiers are not implemented yet");
	this.identifier = declarator.params[0];

	this.intendedType = varType;
	if (types.satisfies(varType, types.int)) {
		this.type = types.int;
	} else {
		throw("Unsupported variable type: " + util.inspect(varType));
	}

	this.variable = context.allocateVariable(this.identifier, this.type, this.intendedType);

	if (node.params[1] === null) {
		/* no initial value provided */
		this.initialValue = null;
	} else {
		this.initialValue = new expressions.Expression(node.params[1], context, true);
		assert(this.initialValue.isConstant, "Non-constant initialisers for variables are not supported");
		assert(
			types.satisfies(this.initialValue.type, this.type),
			util.format("Incompatible types for init declarator: %s vs %s", util.inspect(this.type), util.inspect(this.initialValue.type))
		);
	}
}
VariableDeclarator.prototype.compileAsDeclarator = function(out) {
	/*
	Append zero or more VariableDeclarator nodes to 'out' which implement
	the declaration, but not initial value assignment, for this variable. For example:
	int i = 42;
	will produce the declarator 'i = 0'.
	*/
	if (types.satisfies(this.type, types.int)) {
		out.push(estree.VariableDeclarator(
			estree.Identifier(this.variable.jsIdentifier),
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
			estree.Identifier(this.variable.jsIdentifier),
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
				estree.Identifier(this.variable.jsIdentifier),
				this.initialValue.compile()
			)
		));
	}
};

function Declaration(node, context) {
	/* Represents a C variable declaration line, e.g.
		int i, *j, k = 42;
	*/
	assert.equal('Declaration', node.type);

	var declarationSpecifiers = node.params[0];
	this.type = types.getTypeFromDeclarationSpecifiers(declarationSpecifiers);

	var initDeclaratorList = node.params[1];
	assert(Array.isArray(initDeclaratorList));

	this.variableDeclarators = [];
	for (var i = 0; i < initDeclaratorList.length; i++) {
		this.variableDeclarators.push(
			new VariableDeclarator(initDeclaratorList[i], this.type, context)
		);
	}
}

function BlockStatement(block, parentContext) {
	var i, j;
	assert.equal('Block', block.type);

	this.context = parentContext.createChildContext();

	var declarationNodes = block.params[0];
	assert(Array.isArray(declarationNodes));

	/* unpack declaration list */
	this.variableDeclarators = [];

	for (i = 0; i < declarationNodes.length; i++) {
		var declaration = new Declaration(declarationNodes[i], this.context);

		for (j = 0; j < declaration.variableDeclarators.length; j++) {
			var declarator = declaration.variableDeclarators[j];

			this.variableDeclarators.push(declarator);
		}
	}

	var statementNodes = block.params[1];
	assert(Array.isArray(statementNodes));

	this.statements = [];
	for (i = 0; i < statementNodes.length; i++) {
		this.statements.push(buildStatement(statementNodes[i], this.context));
	}
}
BlockStatement.prototype.compileDeclarators = function(out) {
	/* Append the variable declarators (but not initializers) for this block
		to the list 'out'. Recursively adds the declarators for inner blocks too.
	*/
	var i;
	for (i = 0; i < this.variableDeclarators.length; i++) {
		this.variableDeclarators[i].compileAsDeclarator(out);
	}
	for (i = 0; i < this.statements.length; i++) {
		this.statements[i].compileDeclarators(out);
	}
};
BlockStatement.prototype.compileStatementList = function(out, includeDeclarators) {
	var i;

	if (includeDeclarators) {
		/* This is the top-level block for a function definition.
			Variable declarations (including ones defined in inner blocks)
			shall be output here. For this block's own variables (but not the
			variables of inner blocks), this can be combined with initializing them. */
		var declaratorList = [];
		/* output top-level declarators with initializers */
		for (i = 0; i < this.variableDeclarators.length; i++) {
			this.variableDeclarators[i].compileAsInitDeclarator(declaratorList);
		}
		/* output declarators (without initializers) for inner blocks */
		for (i = 0; i < this.statements.length; i++) {
			this.statements[i].compileDeclarators(declaratorList);
		}
		/* output a VariableDeclaration statement, if any declarators are present */
		if (declaratorList.length) {
			out.push(estree.VariableDeclaration(declaratorList));
		}
	} else {
		/* This is an inner block; we need to initialize block-local variables, but
			not declare them (that's been done at the top level). */
		for (i = 0; i < this.variableDeclarators.length; i++) {
			this.variableDeclarators[i].compileAsInitializer(out);
		}
	}

	for (i = 0; i < this.statements.length; i++) {
		this.statements[i].compile(out);
	}
};
BlockStatement.prototype.compile = function(out, includeDeclarators) {
	var body = [];
	this.compileStatementList(body, includeDeclarators);
	out.push(estree.BlockStatement(body));
};

function Parameter(node, context) {
	assert.equal('ParameterDeclaration', node.type);
	this.intendedType = types.getTypeFromDeclarationSpecifiers(node.params[0]);
	if (types.satisfies(this.intendedType, types.int)) {
		this.type = types.int
	} else {
		throw "Unsupported parameter type: " + utils.inspect(this.intendedType);
	}

	var identifierNode = node.params[1];
	assert.equal('Identifier', identifierNode.type);
	this.identifier = identifierNode.params[0];

	this.variable = context.allocateVariable(this.identifier, this.type, this.intendedType);
}
Parameter.prototype.compileTypeAnnotation = function(out) {
	if (types.satisfies(this.type, types.int)) {
		/* x = x|0; */
		out.push(estree.ExpressionStatement(
			estree.AssignmentExpression('=',
				estree.Identifier(this.variable.jsIdentifier),
				estree.BinaryExpression('|',
					estree.Identifier(this.variable.jsIdentifier),
					estree.Literal(0)
				)
			)
		));
	} else {
		throw "Parameter type annotation not yet implemented: " + util.inspect(this.type);
	}
};

function FunctionDefinition(node, parentContext) {
	assert.equal('FunctionDefinition', node.type);
	var returnTypeNodes = node.params[0];
	this.returnType = types.getTypeFromDeclarationSpecifiers(returnTypeNodes);

	var functionDeclaratorNode = node.params[1];
	assert.equal('FunctionDeclarator', functionDeclaratorNode.type);

	/* No idea what the declaration list is for -
		for now, just assert that it's an empty list */
	var declarationList = node.params[2];
	assert(Array.isArray(declarationList));
	assert.equal(0, declarationList.length);

	/* unpack the FunctionDeclarator node */
	var nameDeclaratorNode = functionDeclaratorNode.params[0];
	assert.equal('Identifier', nameDeclaratorNode.type);
	this.name = nameDeclaratorNode.params[0];

	var parameterNodes = functionDeclaratorNode.params[1];
	assert(Array.isArray(parameterNodes));

	this.context = parentContext.createFunctionContext(this.returnType);

	this.parameters = [];
	var parameterTypes = [];
	var parameterIntendedTypes = [];

	if (!parameterListIsVoid(parameterNodes)) {
		for (var i = 0; i < parameterNodes.length; i++) {
			var parameter = new Parameter(parameterNodes[i], this.context);

			this.parameters.push(parameter);
			parameterTypes.push(parameter.type);
			parameterIntendedTypes.push(parameter.intendedType);
		}
	}
	this.type = types.func(this.returnType, parameterTypes);
	this.intendedType = types.func(this.returnType, parameterIntendedTypes);
	this.variable = parentContext.allocateVariable(this.name, this.type, this.intendedType);

	this.blockStatement = new BlockStatement(node.params[3], this.context);
}
FunctionDefinition.prototype.compile = function() {
	var paramIdentifiers = [];
	var functionBody = [];

	for (var i = 0; i < this.parameters.length; i++) {
		var param = this.parameters[i];
		paramIdentifiers.push(estree.Identifier(param.variable.jsIdentifier));

		param.compileTypeAnnotation(functionBody);
	}

	this.blockStatement.compileStatementList(functionBody, true);

	/* if function is non-void, and does not end with a return statement,
	add a dummy one to serve as a type annotation */
	var lastStatement = functionBody[functionBody.length - 1];
	if (!lastStatement || lastStatement.type != 'ReturnStatement') {
		if (types.equal(this.context.returnType, types.void)) {
			/* no return statement required for void return type */
		} else if (types.equal(this.context.returnType, types.signed)) {
			functionBody.push(estree.ReturnStatement(
				estree.Literal(0)
			));
		} else {
			throw "Unsupported return type: " + util.inspect(this.context.returnType);
		}
	}

	return estree.FunctionDeclaration(
		estree.Identifier(this.variable.jsIdentifier),
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
	this.context = new Context();

	for (var i = 0; i < declarationNodes.length; i++) {
		var node = declarationNodes[i];

		switch (node.type) {
			case 'FunctionDefinition':
				var fd = new FunctionDefinition(node, this.context);
				this.functionDefinitions.push(fd);
				break;
			default:
				throw "Unexpected node type: " + node.type;
		}
	}
}
Module.prototype.compileFunctionDefinitions = function(out) {
	for (var i = 0; i < this.functionDefinitions.length; i++) {
		var fd = this.functionDefinitions[i];
		out.push(fd.compile());
	}
};
Module.prototype.compileExportsTable = function(out) {
	var exportsTable = [];
	for (i = 0; i < this.functionDefinitions.length; i++) {
		var fd = this.functionDefinitions[i];

		exportsTable.push(estree.Property(
			estree.Identifier(fd.name),
			estree.Identifier(fd.variable.jsIdentifier),
			'init'
		));
	}

	out.push(estree.ReturnStatement(
		estree.ObjectExpression(exportsTable)
	));
};
Module.prototype.compile = function() {
	var moduleBody = [
		estree.ExpressionStatement(estree.Literal("use asm"))
	];

	this.compileFunctionDefinitions(moduleBody);
	this.compileExportsTable(moduleBody);

	return estree.Program([
		estree.FunctionDeclaration(
			estree.Identifier(this.name),
			[],
			estree.BlockStatement(moduleBody)
		)
	]);
};

exports.Module = Module;
