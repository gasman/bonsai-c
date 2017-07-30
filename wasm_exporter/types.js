exports.i32 = {
	'category': 'i32',
	'asText': function() {return 'i32';},
	'equals': function(other) {return (other.category == 'i32');}
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
		case 'function':
			var paramTypes = [];
			for (var i = 0; i < typ.paramTypes.length; i++) {
				paramTypes.push(fromCType(typ.paramTypes[i]));
			}
			return exports.func(
				fromCType(typ.returnType),
				paramTypes
			);
		default:
			throw util.format("Don't know how to convert %s to a WebAssembly type",
				util.inspect(typ)
			);
	}
}
exports.fromCType = fromCType;
