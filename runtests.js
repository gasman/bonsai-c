var BonsaiC = require('./bonsai-c');
var assert = require('assert');

var js, module;

function testCompile(filename, expectedResult, params) {
	js = BonsaiC.compile(filename);
	module = eval('(' + js + ')')();
	if (!params) {
		assert.equal(expectedResult, module.main());
	} else {
		assert.equal(expectedResult, module.main.apply(null, params));
	}
}

testCompile('tests/fortytwo.c', 42);
testCompile('tests/add.c', 42);
testCompile('tests/var.c', 42);
testCompile('tests/initvar.c', 42);
testCompile('tests/param.c', 42, [42]);
testCompile('tests/call.c', 42);
testCompile('tests/inner_block.c', 42);
testCompile('tests/while.c', 55);
testCompile('tests/variable_shadowing.c', 65);
testCompile('tests/for.c', 45);
testCompile('tests/if.c', 42);
testCompile('tests/if_no_else.c', 42);
testCompile('tests/calc.c', 42);

console.log("All tests passed");
