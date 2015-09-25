var assert = require('assert');
var util = require('util');
var types = require('./types');
var expressions = require('./expressions');
var estree = require('./estree');

function Context(parentContext) {
	this.variables = {};
	this.parentContext = parentContext || null;
	this.allocatedJSIdentifiers = {};
}
Context.prototype.getVariable = function(identifier) {
	if (identifier in this.variables) {
		return this.variables[identifier];
	} else if (this.parentContext !== null) {
		return this.parentContext.getVariable(identifier);
	}
};
Context.prototype.jsIdentifierIsAllocated = function(identifier) {
	if (this.allocatedJSIdentifiers[identifier]) {
		return true;
	} else if (this.parentContext !== null) {
		return this.parentContext.jsIdentifierIsAllocated(identifier);
	} else {
		return false;
	}
};
Context.prototype.allocateVariable = function(identifier, declaredType, intendedType) {
	var jsIdentifier = identifier;
	var i = 0;
	while (this.jsIdentifierIsAllocated(jsIdentifier)) {
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
	var declarationSpecifiers = new types.DeclarationSpecifiers(parameter.params[0]);
	assert.equal(declarationSpecifiers.storageClass, null, "Storage class specifiers not supported");
	if (!types.equal(
		declarationSpecifiers.type,
		types.void
	)) {
		return false;
	}

	return true;
}

function BreakStatement(node, context) {
	this.context = context;
	assert(node.params.length === 0);
}
BreakStatement.prototype.compileDeclarators = function(out) {
	/* a BreakStatement does not contain variable declarations */
};
BreakStatement.prototype.compile = function(out) {
	out.push(estree.BreakStatement(null));
};

function ContinueStatement(node, context) {
	this.context = context;
	assert(node.params.length === 0);
}
ContinueStatement.prototype.compileDeclarators = function(out) {
	/* a ContinueStatement does not contain variable declarations */
};
ContinueStatement.prototype.compile = function(out) {
	out.push(estree.ContinueStatement(null));
};

function DoWhileStatement(node, context) {
	this.context = context;
	this.test = expressions.buildExpression(node.params[1], this.context, {
		resultIsUsed: true,
		resultIsOnlyUsedInBooleanContext: true,
		isSubexpression: true
	});
	this.body = buildStatement(node.params[0], this.context, false);
}
DoWhileStatement.prototype.compileDeclarators = function(out) {
	compileDeclaratorsFromExpression(this.test);
	this.body.compileDeclarators(out);
};
DoWhileStatement.prototype.compile = function(out) {
	var bodyStatements = [];
	this.body.compile(bodyStatements);
	assert.equal(1, bodyStatements.length);
	var bodyStatement = bodyStatements[0];

	out.push(estree.DoWhileStatement(bodyStatement, expressions.coerce(this.test, types.int)));
};

function compileDeclaratorsFromExpression(expr, out) {
	declaredVars = [];
	expr.findDeclaredVariables(declaredVars);
	for (var i = 0; i < declaredVars.length; i++) {
		compileVariableAsDeclarator(declaredVars[i], null, out);
	}
}

function ExpressionStatement(node, context, isSubexpression) {
	this.context = context;
	this.expressionNode = node.params[0];
	this.isSubexpression = isSubexpression;
	this.expr = expressions.buildExpression(this.expressionNode, this.context, {
		resultIsUsed: false,
		resultIsOnlyUsedInBooleanContext: false,
		isSubexpression: this.isSubexpression
	});
}
ExpressionStatement.prototype.compileDeclarators = function(out) {
	compileDeclaratorsFromExpression(this.expr, out);
};
ExpressionStatement.prototype.compileAsExpression = function(out) {
	return this.expr.compile();
};
ExpressionStatement.prototype.compile = function(out) {
	out.push(estree.ExpressionStatement(this.compileAsExpression()));
};

function DeclarationStatement(node, context) {
	/* Represents a C variable declaration line, e.g.
		int i, *j, k = 42;
	*/
	var declarationSpecifiers = new types.DeclarationSpecifiers(node.params[0]);
	assert.equal(declarationSpecifiers.storageClass, null, "Storage class specifiers not supported");
	this.type = declarationSpecifiers.type;

	var initDeclaratorList = node.params[1];
	assert(Array.isArray(initDeclaratorList));

	this.variableDeclarators = [];
	for (var i = 0; i < initDeclaratorList.length; i++) {
		this.variableDeclarators.push(
			new VariableDeclarator(initDeclaratorList[i], this.type, context)
		);
	}
}
DeclarationStatement.prototype.compileDeclarators = function(out) {
	/* Output 'var' declarations for all declarators in this.variableDeclarators.
	If they provide a constant initial value, assign their values immediately; if not, assign 0 or 0.0
	*/
	for (var i = 0; i < this.variableDeclarators.length; i++) {
		if (this.variableDeclarators[i].initialValue !== null) {
			compileDeclaratorsFromExpression(this.variableDeclarators[i].initialValue, out);
		}
		this.variableDeclarators[i].compileAsDeclarator(out);
	}
};
DeclarationStatement.prototype.compile = function(out) {
	/* Output a comma expression assigning all vars that have non-constant values (if any). */
	var expression = this.compileAsExpression();
	if (expression === null) {
		return;
	} else {
		out.push(estree.ExpressionStatement(expression));
	}
};
DeclarationStatement.prototype.compileAsExpression = function() {
	/* Output a comma expression assigning all vars that have non-constant values (if any). */
	var initializers = [];
	for (var i = 0; i < this.variableDeclarators.length; i++) {
		this.variableDeclarators[i].compileAsInitializer(initializers);
	}
	if (initializers.length === 0) {
		return null;
	} else if (initializers.length === 1) {
		return initializers[0];
	} else {
		return estree.SequenceExpression(initializers);
	}
};


function ForStatement(node, context) {
	this.context = context.createChildContext();

	this.initStatement = buildStatement(node.params[0], this.context, true);

	var testExpressionNode = node.params[1];
	if (testExpressionNode === null) {
		this.testExpression = null;
	} else {
		this.testExpression = expressions.buildExpression(testExpressionNode, this.context, {
			resultIsUsed: true,
			resultIsOnlyUsedInBooleanContext: true,
			isSubexpression: true
		});
	}

	var updateExpressionNode = node.params[2];
	if (updateExpressionNode === null) {
		this.updateExpression = null;
	} else {
		this.updateExpression = expressions.buildExpression(updateExpressionNode, this.context, {
			resultIsUsed: false,
			resultIsOnlyUsedInBooleanContext: false,
			isSubexpression: true
		});
	}

	this.body = buildStatement(node.params[3], this.context, false);
}
ForStatement.prototype.compileDeclarators = function(out) {
	this.initStatement.compileDeclarators(out);
	if (this.testExpression !== null) compileDeclaratorsFromExpression(this.testExpression, out);
	if (this.updateExpression !== null) compileDeclaratorsFromExpression(this.updateExpression, out);
	this.body.compileDeclarators(out);
};
ForStatement.prototype.compile = function(out) {
	var init, test, update;

	init = this.initStatement.compileAsExpression();

	if (this.testExpression === null) {
		test = null;
	} else {
		test = expressions.coerce(this.testExpression, types.int);
	}

	if (this.updateExpression === null) {
		update = null;
	} else {
		update = this.updateExpression.compile();
	}

	var bodyStatements = [];
	this.body.compile(bodyStatements);
	assert.equal(1, bodyStatements.length);
	var bodyStatement = bodyStatements[0];

	out.push(estree.ForStatement(
		init,
		test,
		update,
		bodyStatement
	));
};

function IfStatement(node, context) {
	this.context = context;

	var testExpressionNode = node.params[0];
	this.testExpression = expressions.buildExpression(testExpressionNode, this.context, {
		resultIsUsed: true,
		resultIsOnlyUsedInBooleanContext: true,
		isSubexpression: true
	});
	assert(types.equal(types.int, this.testExpression.type));

	this.thenStatement = buildStatement(node.params[1], this.context, false);
	if (node.params[2] === null) {
		this.elseStatement = null;
	} else {
		this.elseStatement = buildStatement(node.params[2], this.context, false);
	}
}
IfStatement.prototype.compileDeclarators = function(out) {
	compileDeclaratorsFromExpression(this.testExpression, out);
	this.thenStatement.compileDeclarators(out);
	if (this.elseStatement !== null) {
		this.elseStatement.compileDeclarators(out);
	}
};
IfStatement.prototype.compile = function(out) {
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
		this.testExpression.compile(),
		thenStatementNode,
		elseStatementNode
	));
};

function NullStatement(node, context) {
	this.context = context;
	assert(node.params.length === 0);
}
NullStatement.prototype.compileDeclarators = function(out) {
};
NullStatement.prototype.compileAsExpression = function() {
	return null;
};
NullStatement.prototype.compile = function(out) {
};

function ReturnStatement(node, context) {
	this.context = context;
	if (node.params.length) {
		var expressionNode = node.params[0];
		this.expression = expressions.buildExpression(expressionNode, this.context, {
			resultIsUsed: true,
			resultIsOnlyUsedInBooleanContext: false,
			isSubexpression: true
		});
	} else {
		this.expression = null;
	}
	/* do not construct an Expression object yet, as that may perform lookups
		in the context for identifiers that are defined further down the file */
}
ReturnStatement.prototype.compileDeclarators = function(out) {
	if (this.expression !== null) compileDeclaratorsFromExpression(this.expression, out);
};
ReturnStatement.prototype.compile = function(out) {
	var returnValueNode;
	if (this.expression === null) {
		assert(types.equal(this.context.returnType, types.void),
			"Void return statement encountered in a non-void function");
		returnValueNode = null;
	} else {
		var expr = this.expression;
		switch(this.context.returnType.category) {
			case 'signed':
				if (expr.isConstant && types.satisfies(expr.type, types.signed)) {
					/* no type annotation necessary - just return the literal */
					returnValueNode = expr.compile();
				} else if (types.satisfies(expr.type, types.signed) && expr.isTypeAnnotated) {
					/* expression provides its own type annotation - e.g. function call */
					returnValueNode = expr.compile();
				} else if (types.satisfies(expr.type, types.intish)) {
					/* coerce intish to signed using expr|0 */
					returnValueNode = expressions.annotateAsSigned(expr.compile());
				} else {
					/* coerce to intish (if possible - otherwise fail),
					then annotate as signed using expr|0.
					(This shouldn't result in |0 being applied twice, because coerce() only does that when
					coercing intish to signed, and that'll be caught by the case above)
					*/
					returnValueNode = expressions.annotateAsSigned(expressions.coerce(expr, types.intish));
				}
				break;
			case 'double':
				if (expr.isConstant && types.satisfies(expr.type, types.double)) {
					/* no type annotation necessary - just return the literal */
					returnValueNode = expr.compile();
				} else if (types.satisfies(expr.type, types.double) && expr.isTypeAnnotated) {
					/* expression provides its own type annotation - e.g. function call */
					returnValueNode = expr.compile();
				} else if (types.satisfies(expr.type, types.doubleq)) {
					/* +expr */
					returnValueNode = expressions.annotateAsDouble(expr.compile());
				} else {
					throw util.format("Cannot convert %s to a return type of 'double'", util.inspect(expr.type));
				}
				break;
			default:
				throw("Unimplemented return type: " + util.inspect(expr.type));
		}
	}

	out.push(estree.ReturnStatement(returnValueNode));
};

function WhileStatement(node, context) {
	this.context = context;
	testExpressionNode = node.params[0];
	this.testExpression = expressions.buildExpression(testExpressionNode, this.context, {
		resultIsUsed: true,
		resultIsOnlyUsedInBooleanContext: true,
		isSubexpression: true
	});
	this.body = buildStatement(node.params[1], this.context, false);
}
WhileStatement.prototype.compileDeclarators = function(out) {
	compileDeclaratorsFromExpression(this.testExpression, out);
	this.body.compileDeclarators(out);
};
WhileStatement.prototype.compile = function(out) {
	var bodyStatements = [];
	this.body.compile(bodyStatements);
	assert.equal(1, bodyStatements.length);
	var bodyStatement = bodyStatements[0];

	out.push(estree.WhileStatement(expressions.coerce(this.testExpression, types.int), bodyStatement));
};

function buildStatement(statementNode, context, isSubexpression) {
	switch (statementNode.type) {
		case 'Block':
			return new BlockStatement(statementNode, context);
		case 'Break':
			return new BreakStatement(statementNode, context);
		case 'Continue':
			return new ContinueStatement(statementNode, context);
		case 'DeclarationStatement':
			return new DeclarationStatement(statementNode, context);
		case 'DoWhile':
			return new DoWhileStatement(statementNode, context);
		case 'ExpressionStatement':
			return new ExpressionStatement(statementNode, context, isSubexpression);
		case 'For':
			return new ForStatement(statementNode, context);
		case 'If':
			return new IfStatement(statementNode, context);
		case 'NullStatement':
			return new NullStatement(statementNode, context);
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
	} else if (types.satisfies(varType, types.double)) {
		this.type = types.double;
	} else {
		throw("Unsupported variable type: " + util.inspect(varType));
	}

	this.variable = context.allocateVariable(this.identifier, this.type, this.intendedType);

	if (node.params[1] === null) {
		/* no initial value provided */
		this.initialValue = null;
	} else {
		this.initialValue = expressions.buildExpression(node.params[1], context, {
			resultIsUsed: true,
			resultIsOnlyUsedInBooleanContext: false,
			isSubexpression: true
		});
	}
}
function compileVariableAsDeclarator(variable, initialValue, out) {
	/*
	Append zero or more VariableDeclarator nodes to 'out' which implement
	the declaration for this variable, along with initial value assignment, if a
	constant initial value is provided. For example:
	int i = 42;
	will produce the declarator 'i = 0'.
	*/
	if (initialValue === null || !initialValue.isConstant) {
		/* Initial value is not given or is not constant - initialise to 0 */
		if (types.satisfies(variable.type, types.int)) {
			out.push(estree.VariableDeclarator(
				estree.Identifier(variable.jsIdentifier),
				estree.RawLiteral(0, '0')
			));
		} else if (types.satisfies(variable.type, types.double)) {
			out.push(estree.VariableDeclarator(
				estree.Identifier(variable.jsIdentifier),
				estree.RawLiteral(0, '0.0')
			));
		} else {
			throw "Unsupported declaration type: " + util.inspect(variable.type);
		}
	} else {
		out.push(estree.VariableDeclarator(
			estree.Identifier(variable.jsIdentifier),
			expressions.coerce(initialValue, variable.type)
		));
	}
}
VariableDeclarator.prototype.compileAsDeclarator = function(out) {
	compileVariableAsDeclarator(this.variable, this.initialValue, out);
};
VariableDeclarator.prototype.compileAsInitializer = function(out) {
	/*
	Append zero or more AssignmentExpression nodes to 'out' which implement
	initial value assignment for this variable, if that was not already done
	by the declarator. For example:
	int i = foo();
	will produce the expression 'i = foo()|0'.
	*/
	if (this.initialValue === null || this.initialValue.isConstant) {
		/* no initialization to do */
	} else {
		out.push(estree.AssignmentExpression('=',
			estree.Identifier(this.variable.jsIdentifier),
			expressions.coerce(this.initialValue, this.variable.type)
		));
	}
};

function BlockStatement(block, parentContext) {
	var i, j;
	assert.equal('Block', block.type);

	this.context = parentContext.createChildContext();

	var statementNodes = block.params[0];
	assert(Array.isArray(statementNodes));

	this.statements = [];
	for (i = 0; i < statementNodes.length; i++) {
		this.statements.push(buildStatement(statementNodes[i], this.context, false));
	}
}
BlockStatement.prototype.compileDeclarators = function(out) {
	/* Append the variable declarators for this block to the list 'out'. */
	var i;
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
		/* output declarators (optionally with initializers) for inner blocks */
		for (i = 0; i < this.statements.length; i++) {
			this.statements[i].compileDeclarators(declaratorList);
		}
		/* output a VariableDeclaration statement, if any declarators are present */
		if (declaratorList.length) {
			out.push(estree.VariableDeclaration(declaratorList));
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
	var declarationSpecifiers = new types.DeclarationSpecifiers(node.params[0]);
	assert.equal(declarationSpecifiers.storageClass, null, "Storage class specifiers not supported");
	this.intendedType = declarationSpecifiers.type;
	if (types.satisfies(this.intendedType, types.int)) {
		this.type = types.int;
	} else if (types.satisfies(this.intendedType, types.double)) {
		this.type = types.double;
	} else {
		throw "Unsupported parameter type: " + util.inspect(this.intendedType);
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
					estree.RawLiteral(0, '0')
				)
			)
		));
	} else if (types.satisfies(this.type, types.double)) {
		/* x = +x; */
		out.push(estree.ExpressionStatement(
			estree.AssignmentExpression('=',
				estree.Identifier(this.variable.jsIdentifier),
				estree.UnaryExpression('+',
					estree.Identifier(this.variable.jsIdentifier),
					true
				)
			)
		));
	} else {
		throw "Parameter type annotation not yet implemented: " + util.inspect(this.type);
	}
};

function FunctionDefinition(node, parentContext) {
	assert.equal('FunctionDefinition', node.type);
	var declarationSpecifiers = new types.DeclarationSpecifiers(node.params[0]);

	if (declarationSpecifiers.storageClass == 'static') {
		this.isExported = false;
	} else if (declarationSpecifiers.storageClass === null) {
		this.isExported = true;
	} else {
		throw "Unsupported storage class: " + declarationSpecifiers.storageClass;
	}
	this.returnType = declarationSpecifiers.type;

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
				estree.RawLiteral(0, '0')
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
	this.globalDeclarators = [];
	this.context = new Context();

	/* reserve the variable names 'stdlib', 'foreign' and 'heap' */
	this.context.allocateVariable('stdlib', null, null);
	this.context.allocateVariable('foreign', null, null);
	this.context.allocateVariable('heap', null, null);

	for (var i = 0; i < declarationNodes.length; i++) {
		var node = declarationNodes[i];

		switch (node.type) {
			case 'DeclarationStatement':
				var declarationStatement = new DeclarationStatement(node, this.context);
				for (var j = 0; j < declarationStatement.variableDeclarators.length; j++) {
					var declarator = declarationStatement.variableDeclarators[j];
					if (declarator.initialValue === null || declarator.initialValue.isConstant) {
						this.globalDeclarators.push(declarator);
					} else {
						throw "initializer element is not a compile-time constant";
						/* TODO: support expressions that are compile-time constants but not
						constant literals, e.g. '2 + 2' */
					}
				}
				break;
			case 'FunctionDefinition':
				var fd = new FunctionDefinition(node, this.context);
				this.functionDefinitions.push(fd);
				break;
			default:
				throw "Unexpected node type: " + node.type;
		}
	}
}
Module.prototype.compileGlobalDeclarators = function(out) {
	var declaratorList = [];
	for (var i = 0; i < this.globalDeclarators.length; i++) {
		this.globalDeclarators[i].compileAsDeclarator(declaratorList);
	}
	if (declaratorList.length > 0) {
		out.push(estree.VariableDeclaration(declaratorList));
	}
};
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

		if (fd.isExported) {
			exportsTable.push(estree.Property(
				estree.Identifier(fd.name),
				estree.Identifier(fd.variable.jsIdentifier),
				'init'
			));
		}
	}

	out.push(estree.ReturnStatement(
		estree.ObjectExpression(exportsTable)
	));
};
Module.prototype.compile = function() {
	var moduleBody = [
		estree.ExpressionStatement(estree.Literal("use asm"))
	];

	this.compileGlobalDeclarators(moduleBody);
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
