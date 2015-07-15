util = require('util');

function repr(val, depth) {
	return util.inspect(val, { depth: (depth === null ? null : depth - 1) })
}

exports.FunctionDefinition = function(returnType, declarator, declarations, body) {
	this.returnType = returnType;
	this.declarator = declarator;
	this.declarations = declarations;
	this.body = body;
};

exports.UninitialisedDeclaration = function(specifiers) {
	this.specifiers = specifiers;
};

exports.InitialisedDeclaration = function(specifiers, initDeclarators) {
	this.specifiers = specifiers;
	this.initDeclarators = initDeclarators;
};


var statements = {};

statements.Compound = function(declarations, statements) {
	this.declarations = declarations;
	this.statements = statements;
};

statements.Empty = function() {
};

statements.Expression = function(expr) {
	this.expression = expr;
};

statements.Return = function(returnValue) {
	this.returnValue = returnValue;
};
statements.Return.prototype.inspect = function(depth) {
	return "Return(" + repr(this.returnValue, depth) + ")";
};

exports.statements = statements;


var expressions = {};

expressions.Assignment = function(l, op, r) {
	this.l = l;
	this.op = op;
	this.r = r;
};
expressions.Assignment.prototype.inspect = function(depth) {
	return '(' + repr(this.l, depth) + ') ' + this.op + ' (' + repr(this.r, depth) + ')';
};

expressions.Comma = function(l, r) {
	this.l = l;
	this.r = r;
};
expressions.Comma.prototype.inspect = function(depth) {
	return '(' + repr(this.l, depth) + '), (' + repr(this.r, depth) + ')';
};

expressions.Conditional = function(test, ifTrue, ifFalse) {
	this.test = test;
	this.ifTrue = ifTrue;
	this.ifFalse = ifFalse;
};
expressions.Conditional.prototype.inspect = function(depth) {
	return '(' + repr(this.test, depth) + ') ? (' + repr(this.ifTrue, depth) + ') : (' + repr(this.ifFalse, depth) + ')';
};

exports.expressions = expressions;
