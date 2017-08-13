var util = require('util');
var leb = require('leb');

function TypedInstruction(name, opcodesByType) {
	return function(typ) {
		var opcode = opcodesByType[typ.category] || null;
		return {
			'asText': function() {
				return util.format('%s.%s', typ.asText(), name);
			},
			'asBinary': function(out) {
				if (opcode === null) {
					throw(util.format("Unknown opcode for %s.%s", typ.asText(), name));
				} else {
					out.write(Buffer.from([opcode]));
				}
			}
		};
	};
}

exports.Add = TypedInstruction('add', {'i32': 0x6a, 'i64': 0x7c, 'f32': 0x92, 'f64': 0xa0});

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
	if (typ.category == 'i32') {
		return {
			'asText': function() {
				return util.format('%s.const %d', typ.asText(), value);
			},
			'asBinary': function(out) {
				out.write(Buffer.from([0x41]));
				out.write(leb.encodeInt32(value));
			}
		};
	} else if (typ.category == 'f64') {
		return {
			'asText': function() {
				return util.format('%s.const %d', typ.asText(), value);
			},
			'asBinary': function(out) {
				out.write(Buffer.from([0x44]));
				throw("Binary representation of f64.const instruction not implemented yet");
				// out.write(leb.encodeInt32(value));
			}
		};
	} else {
		throw(util.format("Unsupported instruction %s.const", typ.asText()));
	}
};

exports.Div = TypedInstruction('div', {'f32': 0x95, 'f64': 0xa3});
exports.DivS = TypedInstruction('div_s', {'i32': 0x6d, 'i64': 0x7f});

exports.Drop = {
	'asText': function() {return 'drop';}
};

exports.Else = {
	'asText': function() {return 'else';}
};

exports.End = {
	'asText': function() {return 'end';},
	'asBinary': function(out) {
		out.write(Buffer.from([0x0b]));
	}
};

exports.Eq = TypedInstruction('eq', {'i32': 0x46, 'i64': 0x51, 'f32': 0x5b, 'f64': 0x61});
exports.Eqz = TypedInstruction('eqz', {'i32': 0x45, 'i64': 0x50});

exports.GetGlobal = function(index) {
	return {
		'asText': function() {
			return util.format('get_global %d', index);
		}
	};
};

exports.GetLocal = function(index) {
	return {
		'asText': function() {
			return util.format('get_local %d', index);
		},
		'asBinary': function(out) {
			out.write(Buffer.from([0x20]));
			out.write(leb.encodeUInt32(index));
		}
	};
};

exports.Ge = TypedInstruction('ge', {'f32': 0x60, 'f64': 0x66});
exports.GeS = TypedInstruction('ge_s', {'i32': 0x4e, 'i64': 0x59});
exports.Gt = TypedInstruction('gt', {'f32': 0x5e, 'f64': 0x64});
exports.GtS = TypedInstruction('gt_s', {'i32': 0x4a, 'i64': 0x55});

exports.If = {
	'asText': function() {return 'if';}
};

exports.Loop = {
	'asText': function() {return 'loop';}
};

exports.Le = TypedInstruction('le', {'f32': 0x5f, 'f64': 0x65});
exports.LeS = TypedInstruction('le_s', {'i32': 0x4c, 'i64': 0x57});
exports.Lt = TypedInstruction('lt', {'f32': 0x5d, 'f64': 0x63});
exports.LtS = TypedInstruction('lt_s', {'i32': 0x48, 'i64': 0x53});
exports.Mul = TypedInstruction('mul', {'i32': 0x63, 'i64': 0x7e, 'f32': 0x94, 'f64': 0xa2});
exports.Ne = TypedInstruction('ne', {'i32': 0x47, 'i64': 0x52, 'f32': 0x5c, 'f64': 0x62});
exports.RemS = TypedInstruction('rem_s', {'i32': 0x6f, 'i64': 0x81});

exports.Return = {
	'asText': function() {return 'return';},
	'asBinary': function(out) {
		out.write(Buffer.from([0x0f]));
	},
	'isReturn': true
};

exports.SetGlobal = function(index) {
	return {
		'asText': function() {
			return util.format('set_global %d', index);
		}
	};
};

exports.SetLocal = function(index) {
	return {
		'asText': function() {
			return util.format('set_local %d', index);
		},
		'asBinary': function(out) {
			out.write(Buffer.from([0x21]));
			out.write(leb.encodeUInt32(index));
		}
	};
};

exports.Sub = TypedInstruction('sub', {'i32': 0x6b, 'i64': 0x7d, 'f32': 0x93, 'f64': 0xa1});


exports.TeeLocal = function(index) {
	return {
		'asText': function() {
			return util.format('tee_local %d', index);
		}
	};
};

exports.TruncS = function(fromType, toType) {
	return {
		'asText': function() {
			return util.format('%s.trunc_s/%s', toType.asText(), fromType.asText());
		}
	};
};

exports.Unreachable = {
	'asText': function() {return 'unreachable';}
};
