var util = require('util');

exports.double = {
	'category': 'double',
	'size': 8,
	'inspect': function() {return 'double';}
};
exports.int = {
	'category': 'int',
	'size': 4,
	'inspect': function() {return 'int';}
};
exports.void = {
	'category': 'void',
	'inspect': function() {return 'void';}
};

exports.func = function(returnType, paramTypes) {
	return {
		'category': 'function',
		'returnType': returnType,
		'paramTypes': paramTypes,
		'inspect': function() {
			return "function " + util.inspect(this.paramTypes) + " => " + util.inspect(this.returnType);
		}
	};
};

exports.pointer = function(targetType) {
	return {
		'category': 'pointer',
		'targetType': targetType,
		'size': 4,
		'inspect': function() {
			return util.inspect(this.targetType) + "*"
		}
	};
};

function getTypeFromTypeSpecifiers(typeSpecifiers) {
	if (typeSpecifiers.length != 1) {
		throw(util.format(
			"Multi-token type specifiers are not yet supported - got %s",
			util.inspect(typeSpecifiers)
		));
	}
	var token = typeSpecifiers[0];
	switch (token) {
		case 'double':
			return exports.double;
		case 'int':
			return exports.int;
		case 'void':
			return exports.void;
		default:
			throw "Unrecognised data type: " + token;
	}
}

exports.getTypeFromTypeSpecifiers = getTypeFromTypeSpecifiers;

function getTypeFromDeclarationSpecifiers(declarationSpecifiersNode) {
	var storageClassSpecifiers = declarationSpecifiersNode.params[0];
	if (storageClassSpecifiers.length > 0) {
		throw(util.format(
			"Storage class specifiers are not yet supported - got %s",
			util.inspect(storageClassSpecifiers)
		));
	}
	return getTypeFromTypeSpecifiers(declarationSpecifiersNode.params[1]);
}

exports.getTypeFromDeclarationSpecifiers = getTypeFromDeclarationSpecifiers;
