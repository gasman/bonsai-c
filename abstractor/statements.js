var assert = require('assert');
var util = require('util');

var expressions = require('./expressions');
var cTypes = require('./c_types');

function BlockStatement(node, context) {
	this.statementType = 'BlockStatement';

	var statementNodes = node.params[0];
	assert(Array.isArray(statementNodes),
		util.format('BlockStatement expected an array, got %s', util.inspect(statementNodes))
	);

	this.statements = [];

	var childContext = context.createChildContext();

	for (var i = 0; i < statementNodes.length; i++) {
		this.statements.push(
			constructStatement(statementNodes[i], childContext)
		);
	}
}
BlockStatement.prototype.inspect = function() {
	return "Block " + util.inspect(this.statements);
};

function BreakStatement(node, context) {
	this.statementType = 'BreakStatement';
}
BreakStatement.prototype.inspect = function() {
	return "BreakStatement";
};

function ContinueStatement(node, context) {
	this.statementType = 'ContinueStatement';
}
ContinueStatement.prototype.inspect = function() {
	return "ContinueStatement";
};

function DeclarationStatement(node, context) {
	this.statementType = 'DeclarationStatement';

	var declarationSpecifiersNode = node.params[0];
	this.type = cTypes.getTypeFromDeclarationSpecifiers(declarationSpecifiersNode);

	this.variableDeclarations = [];
	var initDeclaratorNodes = node.params[1];
	assert(
		Array.isArray(initDeclaratorNodes),
		util.format(
			'DeclarationStatement expected an array of init declarators, got %s',
			util.inspect(initDeclaratorNodes)
		)
	);
	for (var i = 0; i < initDeclaratorNodes.length; i++) {
		var initDeclaratorNode = initDeclaratorNodes[i];

		assert(
			initDeclaratorNode.type == 'InitDeclarator',
			util.format('Expected an InitDeclarator node, got %s', util.inspect(initDeclaratorNode))
		);

		var identifierNode = initDeclaratorNode.params[0];
		assert(
			identifierNode.type == 'Identifier',
			util.format('Expected an Identifier node, got %s', util.inspect(identifierNode))
		);
		var identifier = identifierNode.params[0];

		var initialValueNode = initDeclaratorNode.params[1];
		var initialValueExpression;
		if (initialValueNode === null) {
			initialValueExpression = null;
		} else {
			initialValueExpression = expressions.constructExpression(initialValueNode, context, {
				'resultIsUsed': true
			});
		}

		this.variableDeclarations.push({
			'variable': context.define(identifier, this.type),
			'initialValueExpression': initialValueExpression
		});

	}
}
DeclarationStatement.prototype.inspect = function() {
	return "Declaration <" + util.inspect(this.type) + "> " + util.inspect(this.variableDeclarations);
};

function ExpressionStatement(node, context) {
	this.statementType = 'ExpressionStatement';

	this.expression = expressions.constructExpression(node.params[0], context, {
		'resultIsUsed': false
	});
}
ExpressionStatement.prototype.inspect = function() {
	return "Expression " + util.inspect(this.expression);
};

function ForStatement(node, context) {
	this.statementType = 'ForStatement';
	/* TODO: see if we need to set up child contexts
	(for the loop body, and the scope in which init / test / update is evaluated) */
	this.init = constructStatement(node.params[0], context);

	if (node.params[1] === null) {
		this.test = null;
	} else {
		this.test = expressions.constructExpression(node.params[1], context, {
			'resultIsUsed': true
		});
	}

	if (node.params[2] === null) {
		this.update = null;
	} else {
		this.update = expressions.constructExpression(node.params[2], context, {
			'resultIsUsed': false
		});
	}

	this.body = constructStatement(node.params[3], context);
}
ForStatement.prototype.inspect = function() {
	return util.format(
		"For (%s; %s; %s) %s",
		util.inspect(this.init), util.inspect(this.test), util.inspect(this.update),
		util.inspect(this.body)
	);
};

function IfStatement(node, context) {
	this.statementType = 'IfStatement';
	this.test = expressions.constructExpression(node.params[0], context, {
		'resultIsUsed': true
	});
	this.thenStatement = constructStatement(node.params[1], context);
	if (node.params[2] === null) {
		this.elseStatement = null;
	} else {
		this.elseStatement = constructStatement(node.params[2], context);
	}
}
IfStatement.prototype.inspect = function() {
	return util.format(
		"If (%s) %s else %s",
		util.inspect(this.test),
		util.inspect(this.thenStatement),
		util.inspect(this.elseStatement)
	);
};

function NullStatement(node, context) {
	this.statementType = 'NullStatement';
}
NullStatement.prototype.inspect = function() {
	return "NullStatement";
};

function ReturnStatement(node, context) {
	this.statementType = 'ReturnStatement';

	this.expression = expressions.constructExpression(node.params[0], context, {
		'resultIsUsed': true
	});
}
ReturnStatement.prototype.inspect = function() {
	return "Return " + util.inspect(this.expression);
};

function WhileStatement(node, context) {
	this.statementType = 'WhileStatement';
	this.condition = expressions.constructExpression(node.params[0], context, {
		'resultIsUsed': true
	});
	this.body = constructStatement(node.params[1], context);
}
WhileStatement.prototype.inspect = function() {
	return "While (" + util.inspect(this.condition) + ") " + util.inspect(this.body);
};


function constructStatement(node, context) {
	switch (node.type) {
		case 'Block':
			return new BlockStatement(node, context);
		case 'Break':
			return new BreakStatement(node, context);
		case 'Continue':
			return new ContinueStatement(node, context);
		case 'DeclarationStatement':
			return new DeclarationStatement(node, context);
		case 'ExpressionStatement':
			return new ExpressionStatement(node, context);
		case 'For':
			return new ForStatement(node, context);
		case 'If':
			return new IfStatement(node, context);
		case 'NullStatement':
			return new NullStatement(node, context);
		case 'Return':
			return new ReturnStatement(node, context);
		case 'While':
			return new WhileStatement(node, context);
		default:
			throw("Unrecognised statement node type: " + node.type);
	}
}

exports.constructStatement = constructStatement;
