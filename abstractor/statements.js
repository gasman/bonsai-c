var assert = require('assert');
var util = require('util');

var declaration = require('./declaration');
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

	var decl = new declaration.Declaration(node, context);

	this.variableDeclarations = decl.variableDeclarations;
}
DeclarationStatement.prototype.inspect = function() {
	return "Declaration " + util.inspect(this.variableDeclarations);
};

function DoWhileStatement(node, context) {
	this.statementType = 'DoWhileStatement';
	this.body = constructStatement(node.params[0], context);
	this.condition = expressions.constructExpression(node.params[1], context, {
		'resultIsUsed': true,
		'resultIsUsedAsBoolean': true
	});
}
DoWhileStatement.prototype.inspect = function() {
	return "Do " + util.inspect(this.body) + " While (" + util.inspect(this.condition) + ")";
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
	var statementContext = context.createChildContext();
	this.init = constructStatement(node.params[0], statementContext);

	if (node.params[1] === null) {
		this.test = null;
	} else {
		this.test = expressions.constructExpression(node.params[1], statementContext, {
			'resultIsUsed': true,
			'resultIsUsedAsBoolean': true
		});
	}

	if (node.params[2] === null) {
		this.update = null;
	} else {
		this.update = expressions.constructExpression(node.params[2], statementContext, {
			'resultIsUsed': false
		});
	}

	this.body = constructStatement(node.params[3], statementContext);
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
		'resultIsUsed': true,
		'resultIsUsedAsBoolean': true
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
	this.returnType = context.returnType;
	if (node.params.length === 0) {
		this.expression = null;
	} else {
		this.expression = expressions.constructExpression(node.params[0], context, {
			'resultIsUsed': true
		});
	}
}
ReturnStatement.prototype.inspect = function() {
	return "Return <" + util.inspect(this.returnType) + "> " + util.inspect(this.expression);
};

function WhileStatement(node, context) {
	this.statementType = 'WhileStatement';
	this.condition = expressions.constructExpression(node.params[0], context, {
		'resultIsUsed': true,
		'resultIsUsedAsBoolean': true
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
		case 'Declaration':
			return new DeclarationStatement(node, context);
		case 'DoWhile':
			return new DoWhileStatement(node, context);
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
