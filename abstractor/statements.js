var assert = require('assert');
var util = require('util');

var expressions = require('./expressions');
var types = require('./types');

function BlockStatement(node, context) {
	this.statementType = 'BlockStatement';

	var statementNodes = node.params[0];
	assert(Array.isArray(statementNodes),
		util.format('BlockStatement expected an array, got %s', util.inspect(statementNodes))
	);

	this.statements = [];

	for (var i = 0; i < statementNodes.length; i++) {
		this.statements.push(
			constructStatement(statementNodes[i], context)
		);
	}
}
BlockStatement.prototype.inspect = function() {
	return "Block " + util.inspect(this.statements);
};

function DeclarationStatement(node, context) {
	this.statementType = 'DeclarationStatement';

	var declarationSpecifiersNode = node.params[0];
	this.type = types.getTypeFromDeclarationSpecifiers(declarationSpecifiersNode);

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
			initialValueExpression = expressions.constructExpression(initialValueNode, context);
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

	this.expression = expressions.constructExpression(node.params[0], context);
}
ExpressionStatement.prototype.inspect = function() {
	return "Expression " + util.inspect(this.expression);
};

function ReturnStatement(node, context) {
	this.statementType = 'ReturnStatement';

	this.expression = expressions.constructExpression(node.params[0], context);
}
ReturnStatement.prototype.inspect = function() {
	return "Return " + util.inspect(this.expression);
};

function constructStatement(node, context) {
	switch (node.type) {
		case 'Block':
			return new BlockStatement(node, context);
		case 'DeclarationStatement':
			return new DeclarationStatement(node, context);
		case 'ExpressionStatement':
			return new ExpressionStatement(node, context);
		case 'Return':
			return new ReturnStatement(node, context);
		default:
			throw("Unrecognised statement node type: " + node.type);
	}
}

exports.constructStatement = constructStatement;
