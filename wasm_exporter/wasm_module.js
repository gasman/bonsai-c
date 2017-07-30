var util = require('util');

var wasmTypes = require('./types');
var compiler = require('./compiler');

function quoteString(str) {
	return '"' + str.replace(/[\\"']/g, '\\$&') + '"';
}

class FunctionDefinition {
	constructor(name, typ, isExported, body) {
		this.name = name;
		this.type = typ;
		this.isExported = isExported;
		this.body = body;
	}

	asText() {
		var atoms = [
			'func',
			util.format('(;%d;)', this.functionIndex),
			util.format('(type %d)', this.typeIndex),
		];
		if (this.type.paramTypes.length) {
			atoms.push(this.type.paramsAsText());
		}
		if (this.type.returnType.category != 'void') {
			atoms.push(this.type.returnTypeAsText());
		}
		var out = "  (" + atoms.join(' ') + "\n";

		var body = [];
		for (var i = 0; i < this.body.length; i++) {
			body.push(this.body[i].asText());
		}
		out += "    " + body.join("\n    ");

		out += ")\n";
		return out;
	}

	static fromAbstractFunctionDefinition(fd) {
		var typ = wasmTypes.fromCType(fd.type);

		var context = {
			'localIndexesById': {}
		};
		var localIndex = 0;
		for (var i = 0; i < fd.parameters.length; i++) {
			var param = fd.parameters[i];
			context.localIndexesById[param.id] = localIndex;
			localIndex++;
		}

		var out = [];
		compiler.compile(fd.body, context, out);

		return new FunctionDefinition(fd.name, typ, fd.isExported, out);
	}
}

class WasmModule {
	constructor() {
		this.types = [];
		this.functions = [];
		this.exports = [];
	}

	defineFunction(functionDefinition) {
		/* look in this module's types list for a type matching this function's type,
		or create one if not found */
		var typeIndex = null;
		for (var i = 0; i < this.types.length; i++) {
			if (this.types[i].equals(functionDefinition.type)) {
				typeIndex = i;
				break;
			}
		}
		if (typeIndex === null) {
			typeIndex = this.types.length;
			this.types[typeIndex] = functionDefinition.type;
		}
		functionDefinition.typeIndex = typeIndex;

		var functionIndex = this.functions.length;
		functionDefinition.functionIndex = functionIndex;
		this.functions[functionIndex] = functionDefinition;

		if (functionDefinition.isExported) {
			this.exports.push(
				[functionDefinition.name, functionIndex]
			);
		}
	}

	asText() {
		var output = "(module\n";
		var i;

		for (i = 0; i < this.types.length; i++) {
			output += util.format("  (type (;%d;) %s)\n", i, this.types[i].asText());
		}

		for (i = 0; i < this.functions.length; i++) {
			output += this.functions[i].asText();
		}

		for (i = 0; i < this.exports.length; i++) {
			output += util.format("  (export %s (func %d))\n",
				quoteString(this.exports[i][0]),
				this.exports[i][1]
			);
		}

		output += ")\n";

		return output;
	}

	static fromAbstractModule(module) {
		var wasm = new WasmModule();
		for (var i = 0; i < module.declarations.length; i++) {
			var declaration = module.declarations[i];

			switch (declaration.declarationType) {
				case 'FunctionDefinition':
					var fd = FunctionDefinition.fromAbstractFunctionDefinition(declaration);
					wasm.defineFunction(fd);
					break;
				default:
					throw util.format("Unsupported declaration type: %s", declaration.declarationType);
			}
		}
		return wasm;
	}
}
exports.WasmModule = WasmModule;
