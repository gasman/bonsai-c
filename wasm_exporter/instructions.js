var util = require('util');
var leb = require('leb');
var ieee754 = require('ieee754');

function SimpleInstruction(name, opcode) {
	return {
		'asText': function() {return name;},
		'asBinary': function(out) {
			out.write(Buffer.from([opcode]));
		}
	};
}

function IndexedInstruction(name, opcode) {
	return function(index) {
		return {
			'asText': function() {
				return util.format('%s %d', name, index);
			},
			'asBinary': function(out) {
				out.write(Buffer.from([opcode]));
				out.write(leb.encodeUInt32(index));
			}
		};
	};
}

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

function BlockInstruction(name, opcode) {
	return function(typ) {
		if (typ && typ.category != 'void') {
			return {
				'asText': function() {
					return util.format("%s (result %s)", name, typ.asText());
				},
				'asBinary': function(out) {
					out.write(Buffer.from([opcode]));
					typ.asBinary(out);
				}
			};
		} else {
			return {
				'asText': function() {
					return name;
				},
				'asBinary': function(out) {
					out.write(Buffer.from([opcode, 0x40]));
				}
			};
		}
	};
}

exports.Add = TypedInstruction('add', {'i32': 0x6a, 'i64': 0x7c, 'f32': 0x92, 'f64': 0xa0});
exports.Block = BlockInstruction('block', 0x02);
exports.Br = IndexedInstruction('br', 0x0c);
exports.Call = IndexedInstruction('call', 0x10);

exports.Const = function(typ, value) {
	if (typ.category == 'i32') {
		return {
			'asText': function() {
				return util.format('i32.const %d', value);
			},
			'asBinary': function(out) {
				out.write(Buffer.from([0x41]));
				out.write(leb.encodeInt32(value));
			}
		};
	} else if (typ.category == 'i64') {
		return {
			'asText': function() {
				return util.format('i64.const %d', value);
			},
			'asBinary': function(out) {
				out.write(Buffer.from([0x42]));
				out.write(leb.encodeInt64(value));
			}
		};
	} else if (typ.category == 'f32') {
		return {
			'asText': function() {
				return util.format('f32.const %d', value);
			},
			'asBinary': function(out) {
				var buf = Buffer.alloc(5);
				buf[0] = 0x43;
				ieee754.write(buf, value, 1, true, 23, 4);
				out.write(buf);
			}
		};
	} else if (typ.category == 'f64') {
		return {
			'asText': function() {
				return util.format('f64.const %d', value);
			},
			'asBinary': function(out) {
				var buf = Buffer.alloc(9);
				buf[0] = 0x44;
				ieee754.write(buf, value, 1, true, 52, 8);
				out.write(buf);
			}
		};
	} else {
		throw(util.format("Unsupported instruction %s.const", typ.asText()));
	}
};

exports.Div = TypedInstruction('div', {'f32': 0x95, 'f64': 0xa3});
exports.DivS = TypedInstruction('div_s', {'i32': 0x6d, 'i64': 0x7f});
exports.Drop = SimpleInstruction('drop', 0x1a);
exports.Else = SimpleInstruction('else', 0x05);
exports.End = SimpleInstruction('end', 0x0b);
exports.Eq = TypedInstruction('eq', {'i32': 0x46, 'i64': 0x51, 'f32': 0x5b, 'f64': 0x61});
exports.Eqz = TypedInstruction('eqz', {'i32': 0x45, 'i64': 0x50});
exports.GetGlobal = IndexedInstruction('get_global', 0x23);
exports.GetLocal = IndexedInstruction('get_local', 0x20);
exports.Ge = TypedInstruction('ge', {'f32': 0x60, 'f64': 0x66});
exports.GeS = TypedInstruction('ge_s', {'i32': 0x4e, 'i64': 0x59});
exports.Gt = TypedInstruction('gt', {'f32': 0x5e, 'f64': 0x64});
exports.GtS = TypedInstruction('gt_s', {'i32': 0x4a, 'i64': 0x55});
exports.If = BlockInstruction('if', 0x04);
exports.Loop = BlockInstruction('loop', 0x03);
exports.Le = TypedInstruction('le', {'f32': 0x5f, 'f64': 0x65});
exports.LeS = TypedInstruction('le_s', {'i32': 0x4c, 'i64': 0x57});
exports.Lt = TypedInstruction('lt', {'f32': 0x5d, 'f64': 0x63});
exports.LtS = TypedInstruction('lt_s', {'i32': 0x48, 'i64': 0x53});
exports.Mul = TypedInstruction('mul', {'i32': 0x6c, 'i64': 0x7e, 'f32': 0x94, 'f64': 0xa2});
exports.Ne = TypedInstruction('ne', {'i32': 0x47, 'i64': 0x52, 'f32': 0x5c, 'f64': 0x62});
exports.RemS = TypedInstruction('rem_s', {'i32': 0x6f, 'i64': 0x81});

exports.Return = {
	'asText': function() {return 'return';},
	'asBinary': function(out) {
		out.write(Buffer.from([0x0f]));
	},
	'isReturn': true
};

exports.SetGlobal = IndexedInstruction('set_global', 0x24);
exports.SetLocal = IndexedInstruction('set_local', 0x21);
exports.Sub = TypedInstruction('sub', {'i32': 0x6b, 'i64': 0x7d, 'f32': 0x93, 'f64': 0xa1});
exports.TeeLocal = IndexedInstruction('tee_local', 0x22);

exports.TruncS = function(fromType, toType) {
	return {
		'asText': function() {
			return util.format('%s.trunc_s/%s', toType.asText(), fromType.asText());
		}
	};
};

exports.Unreachable = SimpleInstruction('unreachable', 0x00);
