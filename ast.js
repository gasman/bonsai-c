util = require('util');

exports.FunctionDefinition = function(returnType, declarator, declarations, body) {
	this.returnType = returnType;
	this.declarator = declarator;
	this.declarations = declarations;
	this.body = body;
};

exports.CompoundStatement = function(declarations, statements) {
	this.declarations = declarations;
	this.statements = statements;
};

exports.EmptyStatement = function() {
};

exports.ExpressionStatement = function(expr) {
	this.expression = expr;
};

exports.ReturnStatement = function(returnValue) {
	this.returnValue = returnValue;
};
exports.ReturnStatement.prototype.inspect = function(depth) {
	return "Return(" + util.inspect(this.returnValue, { depth: depth - 1 }) + ")";
};

exports.UninitialisedDeclaration = function(specifiers) {
	this.specifiers = specifiers;
};

exports.InitialisedDeclaration = function(specifiers, initDeclarators) {
	this.specifiers = specifiers;
	this.initDeclarators = initDeclarators;
};

exports.CommaExpression = function(l, r) {
	this.l = l;
	this.r = r;
};
exports.AssignmentExpression = function(l, op, r) {
	this.l = l;
	this.op = op;
	this.r = r;
};
exports.AssignmentExpression.prototype.inspect = function(depth) {
	return '(' + util.inspect(this.l, {depth: depth - 1}) + ') ' + this.op + ' (' + util.inspect(this.r, {depth: depth - 1}) + ')';
};
