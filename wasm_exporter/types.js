var binary = require('./wasm_binary');

exports.i32 = {
	'category': 'i32',
	'asText': function() {return 'i32';},
	'asBinary': function(out) {
		out.write(Buffer.from([0x7f]));
	},
	'equals': function(other) {return (other.category == 'i32');}
};

exports.f64 = {
	'category': 'f64',
	'asText': function() {return 'f64';},
	'asBinary': function(out) {
		out.write(Buffer.from([0x7c]));
	},
	'equals': function(other) {return (other.category == 'f64');}
};

exports.void = {
	'category': 'void',
	'asText': function() {return '(void)';},
	'equals': function(other) {return (other.category == 'void');}
};

exports.func = function(returnType, paramTypes) {
	return {
		'category': 'function',
		'returnType': returnType,
		'paramTypes': paramTypes,
		'paramsAsText': function() {
			var atoms = ['param'];
			for (var i = 0; i < paramTypes.length; i++) {
				atoms.push(paramTypes[i].asText());
			}
			return '(' + atoms.join(' ') + ')';
		},
		'returnTypeAsText': function() {
			return '(result ' + returnType.asText() + ')';
		},
		'asText': function() {
			var atoms = ['func'];
			if (this.paramTypes.length) {
				atoms.push(this.paramsAsText());
			}
			if (this.returnType.category != 'void') {
				atoms.push(this.returnTypeAsText());
			}
			return '(' + atoms.join(' ') + ')';
		},
		'asBinary': function(out) {
			out.write(Buffer.from([0x60]));
			if (this.returnType.category != 'void') {
				binary.writeVector([], out);
			} else {
				binary.writeVector([returnType], out);
			}
			binary.writeVector(paramTypes, out);
		},
		'equals': function(other) {
			if (other.category != 'function') return false;
			if (!other.returnType.equals(this.returnType)) return false;
			if (other.paramTypes.length != this.paramTypes.length) return false;
			for (var i = 0; i < this.paramTypes.length; i++) {
				if (!other.paramTypes[i].equals(this.paramTypes[i])) return false;
			}
			return true;
		}
	};
};

function fromCType(typ) {
	switch (typ.category) {
		case 'int':
			return exports.i32;
		case 'double':
			return exports.f64;
		case 'function':
			var paramTypes = [];
			for (var i = 0; i < typ.paramTypes.length; i++) {
				paramTypes.push(fromCType(typ.paramTypes[i]));
			}
			return exports.func(
				fromCType(typ.returnType),
				paramTypes
			);
		case 'void':
			return exports.void;
		default:
			throw util.format("Don't know how to convert %s to a WebAssembly type",
				util.inspect(typ)
			);
	}
}
exports.fromCType = fromCType;
