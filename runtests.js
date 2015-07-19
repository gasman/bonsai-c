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

console.log("All tests passed");
