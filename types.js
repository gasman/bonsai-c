var assert = require('assert');
var util = require('util');

exports.fixnum = {'category': 'fixnum'};
exports.int = {'category': 'int'};
exports.intish = {'category': 'intish'};
exports.signed = {'category': 'signed'};
exports.void = {'category': 'void'};

exports.func = function(returnType, paramTypes) {
	return {
		'category': 'function',
		'returnType': returnType,
		'paramTypes': paramTypes
	};
};

var equal = function(t1, t2) {
	if (!t1 || !t2) throw "Undefined type passed to types.equal";
	if (t1.category != t2.category) return false;

	switch (t1.category) {
		case 'fixnum':
		case 'int':
		case 'intish':
		case 'signed':
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
};
exports.equal = equal;

var satisfies = function(t, targetType) {
	switch(targetType.category) {
		case 'intish':
			return (t.category == 'intish' || t.category == 'int' || t.category == 'signed' || t.category == 'unsigned' || t.category == 'fixnum');
		case 'int':
			return (t.category == 'int' || t.category == 'signed' || t.category == 'unsigned' || t.category == 'fixnum');
		case 'signed':
			return (t.category == 'signed' || t.category == 'fixnum');
		case 'unsigned':
			return (t.category == 'unsigned' || t.category == 'fixnum');
		case 'fixnum':
			return (t.category == 'fixnum');
		default:
			throw "Unknown type category for 'satisfies' test: " + targetType.category;
	}
};
exports.satisfies = satisfies;

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
			// a C type of 'int' corresponds to the 'signed' type in asm.js
			return exports.signed;
		case 'void':
			return exports.void;
		default:
			throw('Unsupported type: ' + token);
	}
};
