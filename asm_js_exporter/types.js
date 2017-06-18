exports.fixnum = {
	'category': 'fixnum',
	'satisfies': function(targetType) {
		return ['fixnum', 'signed', 'unsigned', 'extern', 'int', 'intish'].includes(targetType.category);
	}
};

exports.signed = {
	'category': 'signed',
	'satisfies': function(targetType) {
		return targetType.category == 'signed' || targetType.category == 'extern';
	}
};

exports.unsigned = {
	'category': 'unsigned',
	'satisfies': function(targetType) {
		return ['unsigned', 'int', 'intish'].includes(targetType.category);
	}
};

exports.int = {
	'category': 'int',
	'satisfies': function(targetType) {
		return targetType.category == 'int' || targetType.category == 'intish';
	}
};
