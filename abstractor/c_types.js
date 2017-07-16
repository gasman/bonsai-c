var util = require('util');

exports.double = {
	'category': 'double',
	'inspect': function() {return 'double';}
};
exports.int = {
	'category': 'int',
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

function getTypeFromDeclarationSpecifiers(declarationSpecifiersNode) {
	var storageClassSpecifiers = declarationSpecifiersNode.params[0];
	if (storageClassSpecifiers.length > 0) {
		throw(util.format(
			"Storage class specifiers are not yet supported - got %s",
			util.inspect(storageClassSpecifiers)
		));
	}
	var typeSpecifiers = declarationSpecifiersNode.params[1];
	if (typeSpecifiers.length != 1) {
		throw(util.format(
			"Multi-token type specifiers are not yet supported - got %s",
			util.inspect(typeSpecifiers)
		));
	}
	var token = typeSpecifiers[0];
	switch (token) {
		case 'int':
			return exports.int;
		case 'void':
			return exports.void;
		default:
			throw "Unrecognised data type: " + token;
	}
}

exports.getTypeFromDeclarationSpecifiers = getTypeFromDeclarationSpecifiers;
