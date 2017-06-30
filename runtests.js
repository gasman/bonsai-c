var BonsaiC = require('./bonsai-c');
var asmjs = require('asm.js');
var assert = require('assert');

var js, module;

function testCompile(filename, expectedResult, opts) {
	if (!opts) opts = {};

	console.log('running test: ' + filename);
	js = BonsaiC.compile(filename);

	if (!opts.skipValidate) {
		try {
			asmjs.validate(js);
		} catch(e) {
			console.log(filename + ' failed asm.js validation:');
			throw e;
		}
	}

	module = eval('(' + js + ')')();

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

testCompile('tests/fortytwo.c', 42);
testCompile('tests/add.c', 42);
testCompile('tests/var.c', 42);
testCompile('tests/initvar.c', 42);
testCompile('tests/param.c', 42, {params: [42]});
testCompile('tests/call.c', 42, {shouldExport: ['add']});
testCompile('tests/return_negative.c', -42);
testCompile('tests/initvar_negative.c', -42);
testCompile('tests/type_coercion.c', 42);
testCompile('tests/call_assign.c', 42);
testCompile('tests/call_add.c', 42);
testCompile('tests/computed_init.c', 42);
testCompile('tests/inner_block.c', 42);
testCompile('tests/subtract.c', 42);
testCompile('tests/simple_postdecrement.c', 42);
testCompile('tests/simple_postincrement.c', 42);
testCompile('tests/comma.c', 42);
testCompile('tests/postincrement_result.c', 43);
testCompile('tests/postdecrement_result.c', 41);
testCompile('tests/while.c', 55);
testCompile('tests/variable_shadowing.c', 65);
testCompile('tests/chained_add.c', 42);
testCompile('tests/chained_subtract.c', 42);
testCompile('tests/less_than.c', 2);
testCompile('tests/greater_than.c', 1);
testCompile('tests/equal.c', 2);
testCompile('tests/not_equal.c', 1);
testCompile('tests/greater_than_or_equal.c', 2);
testCompile('tests/less_than_or_equal.c', 2);

console.log("All tests passed");
