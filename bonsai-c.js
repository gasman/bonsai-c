var fs = require("fs");
var util = require('util');

var preprocessor = require('./preprocessor');
var parser = require("./parser").parser;
parser.yy = require("./ast");

var compiler = require("./compiler");
var escodegen = require('escodegen');

exports.compile = function(filename) {
	var cSource = fs.readFileSync(filename, "utf8");
	var cTree = parser.parse(cSource);
	var module = new compiler.Module('Module', cTree);
	var jsTree = module.compile();
	return escodegen.generate(jsTree, {'verbatim': 'x-verbatim-property'});
};

function processArgs(argv) {
	var returnArgs = {};
	var args = argv.slice(2);
	for (var i = 0; i < args.length; i++) {
		if (args[i].substring(0, 2) === '-D') {
			var command = args[i].substring(2);
			var regexp = /([a-zA-Z0-9_$]+)(\([ ]?[a-zA-Z0-9,_$ ]+[ ]?\))?[ ]?[=]?([a-zA-Z0-9 \#\?\\\/\-\_\+\=\*\&\^\^\%\$\[\]\(\)\:\;\@\!\.\'\"]+)?/;
			var regex_res = regexp.exec(command);
			var obj = {
				macro: regex_res[1],
				params: regex_res[2] || null,
				replace: regex_res[3] || null
			};
			preprocessor.define(obj);
		} else {
			returnArgs.filename = args[i];
		}
	}
	return returnArgs;
}

exports.main = function(argv) {
	var argObj = processArgs(argv);
	var cSource = fs.readFileSync(argObj.filename, "utf8");
	var processedC = preprocessor.process(cSource, argObj.filename);
	if (processedC instanceof Error) {
		throw processedC;
	}
	var cTree = parser.parse(processedC);
	console.log(util.inspect(cTree, { depth: null }));

	console.log("\n---------\n");

	var module = new compiler.Module('Module', cTree);
	var jsTree = module.compile();
	console.log(util.inspect(jsTree, { depth: null }));

	console.log("\n---------\n");

	var out = escodegen.generate(jsTree, {'verbatim': 'x-verbatim-property'});

	console.log(out);
};

if (typeof module !== 'undefined' && require.main === module) {
	exports.main(process.argv);
}
