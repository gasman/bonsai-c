/* convenience constructors for syntax tree objects to be used by escodegen */
var escodegen = require('escodegen');

exports.AssignmentExpression = function(op, l, r) {
	return {
		'type': 'AssignmentExpression',
		'operator': op,
		'left': l,
		'right': r
	};
};

exports.BinaryExpression = function(op, l, r) {
	return {
		'type': 'BinaryExpression',
		'operator': op,
		'left': l,
		'right': r
	};
};

exports.BlockStatement = function(body) {
	return {'type': 'BlockStatement', 'body': body};
};

exports.BreakStatement = function(label) {
	return {'type': 'BreakStatement', 'label': label};
};

exports.CallExpression = function(callee, args) {
	return {
		'type': 'CallExpression',
		'callee': callee,
		'arguments': args
	};
};

exports.ConditionalExpression = function(test, consequent, alternate) {
	return {
		'type': 'ConditionalExpression',
		'test': test,
		'alternate': alternate,
		'consequent': consequent
	};
};

exports.ContinueStatement = function(label) {
	return {'type': 'ContinueStatement', 'label': label};
};

exports.DoWhileStatement = function(body, test) {
	return {
		'type': 'DoWhileStatement',
		'body': body,
		'test': test
	};
};

exports.ExpressionStatement = function(expr) {
	return {
		'type': 'ExpressionStatement',
		'expression': expr
	};
};

exports.ForStatement = function(init, test, update, body) {
	return {
		'type': 'ForStatement',
		'init': init,
		'test': test,
		'update': update,
		'body': body
	};
};

exports.FunctionDeclaration = function(id, params, body) {
	return {
		'type': 'FunctionDeclaration',
		'id': id,
		'params': params,
		'body': body
	};
};

exports.Identifier = function(name) {
	return {'type': 'Identifier', 'name': name};
};

exports.IfStatement = function(test, consequent, alternate) {
	return {
		'type': 'IfStatement',
		'test': test,
		'consequent': consequent,
		'alternate': alternate
	};
};

exports.Literal = function(value) {
	return {'type': 'Literal', 'value': value};
};

exports.RawLiteral = function(value, raw) {
	return {
		'type': 'Literal',
		'x-verbatim-property': {'content': raw, 'precedence': escodegen.Precedence.Primary},
		'value': value
	};
};

exports.MemberExpression = function(obj, property, computed) {
	return {
		'type': 'MemberExpression',
		'object': obj,
		'property': property,
		'computed': computed
	};
};

exports.ObjectExpression = function(properties) {
	return {'type': 'ObjectExpression', 'properties': properties};
};

exports.Program = function(body) {
	return {'type': 'Program', 'body': body};
};

exports.Property = function(key, value, kind) {
	return {
		'type': 'Property',
		'key': key,
		'value': value,
		'kind': kind
	};
};

exports.ReturnStatement = function(arg) {
	return {
		'type': 'ReturnStatement',
		'argument': arg
	};
};

exports.SequenceExpression = function(expressions) {
	return {
		'type': 'SequenceExpression',
		'expressions': expressions
	};
};

exports.UnaryExpression = function(operator, argument, prefix) {
	return {
		'type': 'UnaryExpression',
		'operator': operator,
		'argument': argument,
		'prefix': prefix
	};
};

exports.VariableDeclaration = function(declarations) {
	return {
		'type': 'VariableDeclaration',
		'declarations': declarations,
		'kind': 'var'
	};
};

exports.VariableDeclarator = function(id, init) {
	return {
		'type': 'VariableDeclarator',
		'id': id,
		'init': init
	};
};

exports.WhileStatement = function(test, body) {
	return {
		'type': 'WhileStatement',
		'test': test,
		'body': body
	};
};
