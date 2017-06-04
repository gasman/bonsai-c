var util = require('util');

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
			return 'int';
		default:
			throw "Unrecognised data type: " + token;
	}
}

exports.getTypeFromDeclarationSpecifiers = getTypeFromDeclarationSpecifiers;
