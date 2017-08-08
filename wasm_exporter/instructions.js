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

exports.Div = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.div', typ.asText());
		}
	};
};

exports.DivS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.div_s', typ.asText());
		}
	};
};

exports.Drop = {
	'asText': function() {return 'drop';}
};

exports.Else = {
	'asText': function() {return 'else';}
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

exports.Eqz = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.eqz', typ.asText());
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

exports.Ge = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.ge', typ.asText());
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

exports.Gt = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.gt', typ.asText());
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

exports.Le = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.le', typ.asText());
		}
	};
};

exports.LeS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.le_s', typ.asText());
		}
	};
};

exports.Lt = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.lt', typ.asText());
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

exports.Mul = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.mul', typ.asText());
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

exports.RemS = function(typ) {
	return {
		'asText': function() {
			return util.format('%s.rem_s', typ.asText());
		}
	};
};

exports.Return = {
	'asText': function() {return 'return';},
	'isReturn': true
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

exports.Unreachable = {
	'asText': function() {return 'unreachable';}
};
