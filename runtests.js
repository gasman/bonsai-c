var BonsaiC = require('./bonsai-c');
var assert = require('assert');

var js, module;

js = BonsaiC.compile('tests/fortytwo.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main());

js = BonsaiC.compile('tests/add.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main());

js = BonsaiC.compile('tests/var.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main());

js = BonsaiC.compile('tests/initvar.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main());

js = BonsaiC.compile('tests/param.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main(42));

js = BonsaiC.compile('tests/call.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main());

js = BonsaiC.compile('tests/inner_block.c');
module = eval('(' + js + ')')();
assert.equal(42, module.main());

js = BonsaiC.compile('tests/while.c');
module = eval('(' + js + ')')();
assert.equal(55, module.main());

js = BonsaiC.compile('tests/variable_shadowing.c');
module = eval('(' + js + ')')();
assert.equal(65, module.main());

js = BonsaiC.compile('tests/for.c');
module = eval('(' + js + ')')();
assert.equal(45, module.main());

console.log("All tests passed");
