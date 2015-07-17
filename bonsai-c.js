var fs = require("fs");
var util = require('util');

var parser = require("./parser").parser;
parser.yy = require("./ast");

var compiler = require("./compiler");

exports.compile = function(filename) {
	var cSource = fs.readFileSync(filename, "utf8");
	var ast = parser.parse(cSource);
	return compiler.compileModule('Module', ast);
}

exports.main = function(argv) {
	var cSource = fs.readFileSync(argv[2], "utf8");
	var ast = parser.parse(cSource);
	console.log(util.inspect(ast, { depth: null }));

	console.log("\n---------\n");

	var output = compiler.compileModule('Module', ast);
	console.log(output);
}

if (typeof module !== 'undefined' && require.main === module) {
	exports.main(process.argv);
}
