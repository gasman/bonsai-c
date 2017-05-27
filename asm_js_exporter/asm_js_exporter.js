var assert = require('assert');
var estree = require('./estree');

function compileModule(module) {
	return estree.Program([
	]);
}

exports.compileModule = compileModule;
