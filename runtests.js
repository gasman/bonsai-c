var BonsaiC = require('./bonsai-c');
var asmjs = require('asm.js');
var assert = require('assert');
var fs = require('fs');
var execFileSync = require('child_process').execFileSync;
var tmp = require('tmp');

var js, module;

var runAll = true;
var runAsmJS = false;
var runWast = false;

for (var i = 2; i < process.argv.length; i++) {
	var arg = process.argv[i];
	if (arg == '--asmjs') {
		runAll = false;
		runAsmJS = true;
	} else if (arg == '--wast') {
		runAll = false;
		runWast = true;
	} else {
		throw("Unrecognised arg: " + arg);
	}
}

function testAsmJSCompile(filename, expectedResult, opts) {
	if (!opts) opts = {};

	console.log('running asm.js test: ' + filename);
	js = BonsaiC.compile(filename, 'asmjs');

	if (!opts.skipValidate) {
		try {
			asmjs.validate(js);
		} catch(e) {
			console.log(filename + ' failed asm.js validation:');
			throw e;
		}
	}

	var heap = new ArrayBuffer(1024);
	module = eval('(' + js + ')')(global, null, heap);

	if (!opts.params) {
		assert.equal(expectedResult, module.main());
	} else {
		assert.equal(expectedResult, module.main.apply(null, opts.params));
	}

	var i;
	if (opts.shouldExport) {
		for (i = 0; i < opts.shouldExport.length; i++) {
			if (!(opts.shouldExport[i] in module)) {
				throw "Expected to find export: " + opts.shouldExport[i];
			}
		}
	}

	if (opts.shouldNotExport) {
		for (i = 0; i < opts.shouldNotExport.length; i++) {
			if (opts.shouldNotExport[i] in module) {
				throw "Name exported, but should not be: " + opts.shouldNotExport[i];
			}
		}
	}
}

if (runAll || runAsmJS) {
	testAsmJSCompile('tests/fortytwo.c', 42);
	testAsmJSCompile('tests/add.c', 42);
	testAsmJSCompile('tests/var.c', 42);
	testAsmJSCompile('tests/initvar.c', 42);
	testAsmJSCompile('tests/param.c', 42, {params: [42]});
	testAsmJSCompile('tests/call.c', 42, {shouldExport: ['add']});
	testAsmJSCompile('tests/return_negative.c', -42);
	testAsmJSCompile('tests/initvar_negative.c', -42);
	testAsmJSCompile('tests/type_coercion.c', 42);
	testAsmJSCompile('tests/call_assign.c', 42);
	testAsmJSCompile('tests/call_add.c', 42);
	testAsmJSCompile('tests/computed_init.c', 42);
	testAsmJSCompile('tests/inner_block.c', 42);
	testAsmJSCompile('tests/subtract.c', 42);
	testAsmJSCompile('tests/simple_postdecrement.c', 42);
	testAsmJSCompile('tests/simple_postincrement.c', 42);
	testAsmJSCompile('tests/comma.c', 42);
	testAsmJSCompile('tests/postincrement_result.c', 43);
	testAsmJSCompile('tests/postdecrement_result.c', 41);
	testAsmJSCompile('tests/while.c', 55);
	testAsmJSCompile('tests/variable_shadowing.c', 65);
	testAsmJSCompile('tests/chained_add.c', 42);
	testAsmJSCompile('tests/chained_subtract.c', 42);
	testAsmJSCompile('tests/less_than.c', 2);
	testAsmJSCompile('tests/less_than_var.c', 2);
	testAsmJSCompile('tests/greater_than.c', 1);
	testAsmJSCompile('tests/greater_than_var.c', 1);
	testAsmJSCompile('tests/equal.c', 2);
	testAsmJSCompile('tests/equal_var.c', 2);
	testAsmJSCompile('tests/not_equal.c', 1);
	testAsmJSCompile('tests/not_equal_var.c', 1);
	testAsmJSCompile('tests/greater_than_or_equal.c', 2);
	testAsmJSCompile('tests/greater_than_or_equal_var.c', 2);
	testAsmJSCompile('tests/less_than_or_equal.c', 2);
	testAsmJSCompile('tests/less_than_or_equal_var.c', 2);
	testAsmJSCompile('tests/for.c', 45);
	testAsmJSCompile('tests/for_with_declarator.c', 45);
	testAsmJSCompile('tests/add_assign.c', 42);
	testAsmJSCompile('tests/subtract_assign.c', 42);
	testAsmJSCompile('tests/for_without_init.c', 45);
	testAsmJSCompile('tests/if.c', 42);
	testAsmJSCompile('tests/if_no_else.c', 42);
	testAsmJSCompile('tests/break.c', 42);
	testAsmJSCompile('tests/for_without_test.c', 45);
	testAsmJSCompile('tests/for_without_update.c', 45);
	testAsmJSCompile('tests/continue.c', 42);
	testAsmJSCompile('tests/conditional.c', 42);
	testAsmJSCompile('tests/logical_not.c', 0);
	testAsmJSCompile('tests/double.c', 42);
	testAsmJSCompile('tests/logical_and.c', 42);
	testAsmJSCompile('tests/logical_or.c', 42);
	testAsmJSCompile('tests/double_var.c', 42);
	testAsmJSCompile('tests/double_add.c', 42);
	testAsmJSCompile('tests/reserved_vars.c', 42);
	testAsmJSCompile('tests/reserved_vars_as_params.c', 42);
	testAsmJSCompile('tests/empty_params.c', 42);
	testAsmJSCompile('tests/void_return.c', 42);
	testAsmJSCompile('tests/void_function_without_return.c', 42);
	testAsmJSCompile('tests/do_while.c', 55);
	testAsmJSCompile('tests/logical_shortcuts.c', 42);
	testAsmJSCompile('tests/double_mul.c', 42);
	testAsmJSCompile('tests/int_div.c', 42);
	testAsmJSCompile('tests/late_declaration.c', 52);
	testAsmJSCompile('tests/nonconstant_declare.c', 42);
	testAsmJSCompile('tests/int_mod.c', 42);
	testAsmJSCompile('tests/double_mod.c', 42);
	testAsmJSCompile('tests/double_to_signed.c', 42);
	testAsmJSCompile('tests/static_func.c', 42, {shouldNotExport: ['add']});
	testAsmJSCompile('tests/global_var.c', 42);
	testAsmJSCompile('tests/double_subtract.c', 42);
	testAsmJSCompile('tests/int_mul.c', 42);
	testAsmJSCompile('tests/global_array.c', 42);
	testAsmJSCompile('tests/shift_left.c', 42);
	testAsmJSCompile('tests/shift_right.c', 42);
	testAsmJSCompile('tests/pointer_var.c', 42);
	testAsmJSCompile('tests/pointer_add.c', 42);
	testAsmJSCompile('tests/add_var.c', 42);
}

function testWastCompile(filename, expectedResult, opts) {
	if (!opts) opts = {};

	console.log('running WebAssembly text test: ' + filename);
	wastText = BonsaiC.compile(filename, 'wast');

	var wastFile = tmp.fileSync();
	fs.writeSync(wastFile.fd, wastText, 'utf8');
	fs.closeSync(wastFile.fd);

	var wasmFilename = tmp.tmpNameSync();
	execFileSync('wast2wasm', [wastFile.name, '-o', wasmFilename]);
	buf = fs.readFileSync(wasmFilename);
	fs.unlinkSync(wasmFilename);

	assert(WebAssembly.validate(buf));
	var mdl = new WebAssembly.Module(buf);
	var instance = new WebAssembly.Instance(mdl);

	if (!opts.params) {
		assert.equal(expectedResult, instance.exports.main());
	} else {
		assert.equal(expectedResult, instance.exports.main.apply(null, opts.params));
	}

	var i;
	if (opts.shouldExport) {
		for (i = 0; i < opts.shouldExport.length; i++) {
			if (!(opts.shouldExport[i] in instance.exports)) {
				throw "Expected to find export: " + opts.shouldExport[i];
			}
		}
	}

	if (opts.shouldNotExport) {
		for (i = 0; i < opts.shouldNotExport.length; i++) {
			if (opts.shouldNotExport[i] in instance.exports) {
				throw "Name exported, but should not be: " + opts.shouldNotExport[i];
			}
		}
	}
}

if (runAll || runWast) {
	testWastCompile('tests/fortytwo.c', 42);
	testWastCompile('tests/param.c', 42, {params: [42]});
	testWastCompile('tests/var.c', 42);
	testWastCompile('tests/initvar.c', 42);
	testWastCompile('tests/add.c', 42);
	testWastCompile('tests/add_var.c', 42);
	testWastCompile('tests/nonconstant_declare.c', 42);
	testWastCompile('tests/subtract.c', 42);
	testWastCompile('tests/subtract_var.c', 42);
	testWastCompile('tests/call.c', 42, {shouldExport: ['add']});
	testWastCompile('tests/void_return.c', 42);
	testWastCompile('tests/void_function_without_return.c', 42);
	testWastCompile('tests/return_negative.c', -42);
	testWastCompile('tests/initvar_negative.c', -42);
	testWastCompile('tests/call_assign.c', 42);
	testWastCompile('tests/call_add.c', 42);
	testWastCompile('tests/type_coercion.c', 42);
	testWastCompile('tests/computed_init.c', 42);
	testWastCompile('tests/inner_block.c', 42);
	testWastCompile('tests/simple_postdecrement.c', 42);
	testWastCompile('tests/simple_postincrement.c', 42);
	testWastCompile('tests/comma.c', 42);
	testWastCompile('tests/postincrement_result.c', 43);
	testWastCompile('tests/postdecrement_result.c', 41);
	testWastCompile('tests/while.c', 55);
	testWastCompile('tests/variable_shadowing.c', 65);
	testWastCompile('tests/chained_add.c', 42);
	testWastCompile('tests/chained_subtract.c', 42);
	testWastCompile('tests/less_than.c', 2);
	testWastCompile('tests/less_than_var.c', 2);
	testWastCompile('tests/greater_than.c', 1);
	testWastCompile('tests/greater_than_var.c', 1);
	testWastCompile('tests/equal.c', 2);
	testWastCompile('tests/equal_var.c', 2);
	testWastCompile('tests/not_equal.c', 1);
	testWastCompile('tests/not_equal_var.c', 1);
	testWastCompile('tests/greater_than_or_equal.c', 2);
	testWastCompile('tests/greater_than_or_equal_var.c', 2);
	testWastCompile('tests/less_than_or_equal.c', 2);
	testWastCompile('tests/less_than_or_equal_var.c', 2);
	testWastCompile('tests/for.c', 45);
	testWastCompile('tests/for_with_declarator.c', 45);
	testWastCompile('tests/add_assign.c', 42);
	testWastCompile('tests/subtract_assign.c', 42);
	testWastCompile('tests/for_without_init.c', 45);
	testWastCompile('tests/if.c', 42);
}

console.log("All tests passed");
