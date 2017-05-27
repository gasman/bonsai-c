/* convenience constructors for syntax tree objects to be used by escodegen */

exports.BlockStatement = function(body) {
	return {'type': 'BlockStatement', 'body': body};
};

exports.ExpressionStatement = function(expr) {
	return {
		'type': 'ExpressionStatement',
		'expression': expr
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

exports.Literal = function(value) {
	return {'type': 'Literal', 'value': value};
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
