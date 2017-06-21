var util = require('util');

exports.fixnum = {
	'category': 'fixnum',
	'satisfies': function(targetType) {
		return ['fixnum', 'signed', 'unsigned', 'extern', 'int', 'intish'].includes(targetType.category);
	},
	'inspect': function() {return 'fixnum';}
};

exports.signed = {
	'category': 'signed',
	'satisfies': function(targetType) {
		return ['signed', 'extern', 'int', 'intish'].includes(targetType.category);
	},
	'inspect': function() {return 'signed';}
};

exports.unsigned = {
	'category': 'unsigned',
	'satisfies': function(targetType) {
		return ['unsigned', 'int', 'intish'].includes(targetType.category);
	},
	'inspect': function() {return 'unsigned';}
};

exports.int = {
	'category': 'int',
	'satisfies': function(targetType) {
		return targetType.category == 'int' || targetType.category == 'intish';
	},
	'inspect': function() {return 'int';}
};

exports.intish = {
	'category': 'intish',
	'satisfies': function(targetType) {
		return targetType.category == 'intish';
	},
	'inspect': function() {return 'intish';}
};

exports.func = function(returnType, paramTypes) {
	return {
		'category': 'function',
		'returnType': returnType,
		'paramTypes': paramTypes,
		'inspect': function() {
			return "function " + util.inspect(paramTypes) + " => " + util.inspect(returnType);
		}
	};
};
