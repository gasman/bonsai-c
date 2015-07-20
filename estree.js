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

exports.CallExpression = function(callee, args) {
	return {
		'type': 'CallExpression',
		'callee': callee,
		'arguments': args
	};
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
