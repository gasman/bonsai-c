var assert = require('assert');
var util = require('util');
var leb = require('leb');
var streamBuffers = require('stream-buffers');

var wasmTypes = require('./types');
var compiler = require('./compiler');
var instructions = require('./instructions');
var binary = require('./wasm_binary');

function quoteString(str) {
	return '"' + str.replace(/[\\"']/g, '\\$&') + '"';
}

class Context {
	constructor(parentContext) {
		this.parentContext = parentContext;
		if (parentContext) {
			this.globalContext = parentContext.globalContext;
		} else {
			this.globalContext = this;
		}

		this.variableIndexesById = {};
		this.variableIndex = 0;
		this.variableDeclarations = [];
		this.functionIndexesById = {};
	}

	getIndex(id) {
		if (id in this.variableIndexesById) {
			return this.variableIndexesById[id];
		} else if (this.parentContext) {
			return this.parentContext.getIndex(id);
		} else {
			return null;
		}
	}

	allocateVariable(id) {
		var index = this.variableIndex;
		if (id !== null) {
			this.variableIndexesById[id] = index;
		}
		this.variableIndex++;
		return index;
	}

	declareVariable(id, typ, initialValue) {
		if (this.parentContext && initialValue !== null) {
			throw "Initial variable values are only valid in the global context";
		}
		var index = this.allocateVariable(id);
		this.variableDeclarations.push({'type': typ, 'initialValue': initialValue});
		return index;
	}

	declareFunction(id, index) {
		assert(!this.parentContext, "Functions can only be declared in the global context");
		this.functionIndexesById[id] = index;
	}

	getFunctionIndex(id) {
		assert(!this.parentContext, "Functions can only be looked up in the global context");
		if (id in this.functionIndexesById) {
			return this.functionIndexesById[id];
		} else {
			return null;
		}
	}

	createChildContext() {
		return new Context(this);
	}
}

class FunctionDefinition {
	constructor(name, typ, isExported, locals, body) {
		this.name = name;
		this.type = typ;
		this.isExported = isExported;
		this.locals = locals;
		this.body = body;
	}

	asText() {
		var i;

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
		if (this.locals.length) {
			var localAtoms = ['local'];
			for (i = 0; i < this.locals.length; i++) {
				localAtoms.push(this.locals[i].type.asText());
			}
			atoms.push('(' + localAtoms.join(' ') + ')');
		}
		var out = "  (" + atoms.join(' ') + "\n";

		var body = [];
		for (i = 0; i < this.body.length; i++) {
			body.push(this.body[i].asText());
		}
		out += "    " + body.join("\n    ");

		out += ")\n";
		return out;
	}

	asBinary(out) {
		var i;

		var code = new streamBuffers.WritableStreamBuffer();

		// TODO: group consecutive locals of the same type into the same 'locals' entry
		// (also, for bonus points: reorder them so all of the same type ones appear together)
		code.write(leb.encodeUInt32(this.locals.length));
		for (i = 0; i < this.locals.length; i++) {
			code.write(leb.encodeUInt32(1));
			this.locals[i].type.asBinary(code);
		}
		for (i = 0; i < this.body.length; i++) {
			if (!this.body[i].asBinary) {
				throw("No binary representation provided for instruction: " + this.body[i].asText());
			}
			this.body[i].asBinary(code);
		}
		instructions.End.asBinary(code);

		code.end();
		var codeBuf = code.getContents();
		out.write(leb.encodeUInt32(codeBuf.length));
		out.write(codeBuf);
	}

	static fromAbstractFunctionDefinition(fd, globalContext) {
		var typ = wasmTypes.fromCType(fd.type);

		var context = globalContext.createChildContext();

		for (var i = 0; i < fd.parameters.length; i++) {
			context.allocateVariable(fd.parameters[i].id);
		}

		var out = [];
		compiler.compile(fd.body, context, out, null, null);

		/*
		non-void functions that don't end in an explicit return
		must terminate with 'unreachable'
		*/
		if (typ.returnType.category != 'void' && !out[out.length - 1].isReturn) {
			out.push(instructions.Unreachable);
		}

		return new FunctionDefinition(fd.name, typ, fd.isExported, context.variableDeclarations, out);
	}
}

class FunctionExport {
	constructor(name, functionIndex) {
		this.name = name;
		this.functionIndex = functionIndex;
	}
	asText() {
		return util.format("  (export %s (func %d))\n",
			quoteString(this.name),
			this.functionIndex
		);
	}
	asBinary(out) {
		var nameBuf = Buffer.from(this.name, 'utf8');
		out.write(leb.encodeUInt32(nameBuf.length));
		out.write(nameBuf);
		out.write(Buffer.from([0x00]));  // identify as a function export
		out.write(leb.encodeUInt32(this.functionIndex));
	}
}

class GlobalDeclaration {
	constructor(typ, isMutable, initialValueInstruction) {
		this.type = typ;
		this.isMutable = isMutable;
		this.initialValueInstruction = initialValueInstruction;
	}
	asText() {
		var globalType;
		if (this.isMutable) {
			globalType = util.format("(mut %s)", this.type.asText());
		} else {
			globalType = this.type.asText();
		}

		return util.format(
			"  (global (;%d;) %s %s)\n",
			i, globalType, this.initialValueInstruction.asText()
		);
	}
	asBinary(out) {
		this.type.asBinary(out);
		if (this.isMutable) {
			out.write(Buffer.from([0x01]));
		} else {
			out.write(Buffer.from([0x00]));
		}
		this.initialValueInstruction.asBinary(out);
		instructions.End.asBinary(out);
	}
}

class WasmModule {
	constructor() {
		this.types = [];
		this.functions = [];
		this.globals = [];
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
			this.exports.push(new FunctionExport(
				functionDefinition.name, functionIndex
			));
		}

		return functionIndex;
	}

	defineGlobal(typ, isMutable, initialValueInstruction) {
		this.globals.push(new GlobalDeclaration(typ, isMutable, initialValueInstruction));
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

		for (i = 0; i < this.globals.length; i++) {
			output += this.globals[i].asText();
		}

		for (i = 0; i < this.exports.length; i++) {
			output += this.exports[i].asText();
		}

		output += ")\n";

		return output;
	}

	asBinary(out) {
		// magic number / version number
		out.write(Buffer.from([0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00]));

		function writeSection(id, out, callback) {
			var sectionOut = new streamBuffers.WritableStreamBuffer();
			callback(sectionOut);
			sectionOut.end();
			var buf = sectionOut.getContents();
			if (buf.length) {
				out.write(Buffer.from([id]));
				out.write(leb.encodeUInt32(buf.length));
				out.write(buf);
			}
		}

		// write type section
		writeSection(1, out, (out) => {
			binary.writeVector(this.types, out);
		});

		// write function section (list of type indices)
		writeSection(3, out, (out) => {
			out.write(leb.encodeUInt32(this.functions.length));
			for (var i = 0; i < this.functions.length; i++) {
				out.write(leb.encodeUInt32(this.functions[i].typeIndex));
			}
		});

		// write globals section
		writeSection(6, out, (out) => {
			binary.writeVector(this.globals, out);
		});

		// write exports section
		writeSection(7, out, (out) => {
			binary.writeVector(this.exports, out);
		});

		// write code section
		writeSection(10, out, (out) => {
			binary.writeVector(this.functions, out);
		});
	}

	static fromAbstractModule(module) {
		var wasm = new WasmModule();
		var globalContext = new Context();

		var i;

		for (i = 0; i < module.declarations.length; i++) {
			var declaration = module.declarations[i];

			switch (declaration.declarationType) {
				case 'FunctionDefinition':
					var fd = FunctionDefinition.fromAbstractFunctionDefinition(declaration, globalContext);
					var functionIndex = wasm.defineFunction(fd);
					globalContext.declareFunction(declaration.variable.id, functionIndex);
					break;
				case 'VariableDeclaration':
					for (var j = 0; j < declaration.variableDeclarations.length; j++) {
						var variableDeclaration = declaration.variableDeclarations[j];
						var initialValue = null;
						if (variableDeclaration.initialValueExpression) {
							assert(variableDeclaration.initialValueExpression.isCompileTimeConstant);
							initialValue = variableDeclaration.initialValueExpression.compileTimeConstantValue;
						}
						globalContext.declareVariable(
							variableDeclaration.variable.id,
							wasmTypes.fromCType(variableDeclaration.variable.type),
							initialValue
						);
					}
					break;
				default:
					throw util.format("Unsupported declaration type: %s", declaration.declarationType);
			}
		}

		for (i = 0; i < globalContext.variableDeclarations.length; i++) {
			var variable = globalContext.variableDeclarations[i];
			var initialValueInstruction = instructions.Const(variable.type, variable.initialValue || 0);
			wasm.defineGlobal(variable.type, true, initialValueInstruction);
		}

		return wasm;
	}
}
exports.WasmModule = WasmModule;
