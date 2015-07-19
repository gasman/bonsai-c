var assert = require('assert');
var util = require('util');

exports.int = {'category': 'int'};
exports.void = {'category': 'void'};

exports.func = function(returnType, paramTypes) {
	return {
		'category': 'function',
		'returnType': returnType,
		'paramTypes': paramTypes
	}
}

var equal = function(t1, t2) {
	if (!t1 || !t2) throw "Undefined type passed to types.equal";
	if (t1.category != t2.category) return false;

	switch (t1.category) {
		case 'int':
		case 'void':
			return true;
		case 'function':
			if (!equal(t1.returnType, t2.returnType)) return false;
			if (t1.paramTypes.length != t2.paramTypes.length) return false;
			for (var i = 0; i < t1.paramTypes.length; i++) {
				if (!equal(t1.paramTypes[i], t2.paramTypes[i])) return false;
			}
			return true;
		default:
			throw "Unknown type category: " + t1.category;
	}
}
exports.equal = equal;

exports.getTypeFromDeclarationSpecifiers = function(declarationSpecifiers) {
	assert(Array.isArray(declarationSpecifiers),
		util.format(
			'getTypeFromDeclarationSpecifiers expected an array, got %s',
			util.inspect(declarationSpecifiers)
		)
	);

	if (declarationSpecifiers.length != 1) {
		throw(util.format(
			"Multi-token declaration specifiers are not yet supported - got %s",
			util.inspect(declarationSpecifiers)
		));
	}

	var token = declarationSpecifiers[0];
	switch (token) {
		case 'int':
			return exports.int;
		case 'void':
			return exports.void;
		default:
			throw('Unsupported type: ' + token);
	}
}
