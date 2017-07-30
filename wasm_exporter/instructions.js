var util = require('util');

exports.Const = function(typ, value) {
	return {
		'asText': function() {
			return util.format('%s.const %d', typ.asText(), value);
		}
	};
};

exports.GetLocal = function(index) {
	return {
		'asText': function() {
			return util.format('get_local %d', index);
		}
	};
};

exports.Return = {
	'asText': function() {return 'return';}
};
