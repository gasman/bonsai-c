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

exports.Eq = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.eq', typ.asText());
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

exports.GeS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.ge_s', typ.asText());
		}
	};
};

exports.GtS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.gt_s', typ.asText());
		}
	};
};

exports.If = {
	'asText': function() {return 'if';}
};

exports.Loop = {
	'asText': function() {return 'loop';}
};

exports.LeS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.le_s', typ.asText());
		}
	};
};

exports.LtS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.lt_s', typ.asText());
		}
	};
};

exports.Ne = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.ne', typ.asText());
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
