var fs = require("fs");
var util = require('util');

var parser = require("./c_parser/parser").parser;
parser.yy = require("./c_parser/syntax_tree");

var abstractor = require("./abstractor/abstractor");
var asmJsExporter = require("./asm_js_exporter/asm_js_exporter");
var escodegen = require('escodegen');

exports.compile = function(filename) {
	var cSource = fs.readFileSync(filename, "utf8");
	var cTree = parser.parse(cSource);
	var module = new abstractor.Module(cTree);
	var jsTree = asmJsExporter.compileModule(module);
	return escodegen.generate(jsTree, {'verbatim': 'x-verbatim-property'});
};

exports.main = function(argv) {
	var cSource = fs.readFileSync(argv[2], "utf8");
	var cTree = parser.parse(cSource);
	console.log(util.inspect(cTree, { depth: null }));

	console.log("\n---------\n");

	var module = new abstractor.Module(cTree);
	console.log(util.inspect(module));

	console.log("\n---------\n");
	var jsTree = asmJsExporter.compileModule(module);
	console.log(util.inspect(jsTree, { depth: null }));

	console.log("\n---------\n");

	var out = escodegen.generate(jsTree, {'verbatim': 'x-verbatim-property'});

	console.log(out);
};

if (typeof module !== 'undefined' && require.main === module) {
	exports.main(process.argv);
}
