var assert = require('assert');
var util = require('util');

var expressions = require('./expressions');


function BlockStatement(node) {
	this.statementType = 'BlockStatement';

	var statementNodes = node.params[0];
	assert(Array.isArray(statementNodes),
		util.format('BlockStatement expected an array, got %s', util.inspect(statementNodes))
	);

	this.statements = [];

	for (var i = 0; i < statementNodes.length; i++) {
		this.statements.push(
			constructStatement(statementNodes[i])
		);
	}
}
BlockStatement.prototype.inspect = function() {
	return "Block " + util.inspect(this.statements);
};

function ReturnStatement(node) {
	this.statementType = 'ReturnStatement';

	this.expression = expressions.constructExpression(node.params[0]);
}

function constructStatement(node) {
	switch (node.type) {
		case 'Block':
			return new BlockStatement(node);
		case 'Return':
			return new ReturnStatement(node);
		default:
			throw("Unrecognised statement node type: " + node.type);
	}
}

exports.constructStatement = constructStatement;
