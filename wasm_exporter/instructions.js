var util = require('util');

exports.Add = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.add', typ.asText());
		}
	};
};

exports.Block = {
	'asText': function() {return 'block';}
};

exports.Br = function(level) {
	return {
		'asText': function() {
			return util.format('br %d', level);
		}
	};
};

exports.Call = function(index) {
	return {
		'asText': function() {
			return util.format('call %d', index);
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

exports.End = {
	'asText': function() {return 'end';}
};

exports.GetLocal = function(index) {
	return {
		'asText': function() {
			return util.format('get_local %d', index);
		}
	};
};

exports.If = {
	'asText': function() {return 'if';}
};

exports.Loop = {
	'asText': function() {return 'loop';}
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

exports.Sub = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.sub', typ.asText());
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
