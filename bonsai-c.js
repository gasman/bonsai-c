var fs = require("fs");
var util = require('util');

var parser = require("./parser").parser;
parser.yy = require("./ast");

var compiler = require("./compiler");
var escodegen = require('escodegen');

exports.compile = function(filename) {
	var cSource = fs.readFileSync(filename, "utf8");
	var cTree = parser.parse(cSource);
	var jsTree = compiler.compileModule('Module', cTree);
	return escodegen.generate(jsTree);
};

exports.main = function(argv) {
	var cSource = fs.readFileSync(argv[2], "utf8");
	var ast = parser.parse(cSource);
	console.log(util.inspect(ast, { depth: null }));

	console.log("\n---------\n");

	var jsTree = compiler.compileModule('Module', ast);
	console.log(util.inspect(jsTree, { depth: null }));

	console.log("\n---------\n");

	var out = escodegen.generate(jsTree);

	console.log(out);
};

if (typeof module !== 'undefined' && require.main === module) {
	exports.main(process.argv);
}
