var util = require('util');

exports.Add = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.add', typ.asText());
		}
	};
};

exports.Const = function(typ, value) {
	return {
		'asText': function() {
			return util.format('%s.const %d', typ.asText(), value);
		}
	};
};

exports.Drop = {
	'asText': function() {return 'drop';}
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

exports.SetLocal = function(index) {
	return {
		'asText': function() {
			return util.format('set_local %d', index);
		}
	};
};

exports.TeeLocal = function(index) {
	return {
		'asText': function() {
			return util.format('tee_local %d', index);
		}
	};
};
