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

console.log("All tests passed");
