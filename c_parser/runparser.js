var fs = require("fs");
var util = require('util');

var parser = require("./parser").parser;
parser.yy = require("./syntax_tree");

exports.main = function(argv) {
	var cSource = fs.readFileSync(argv[2], "utf8");
	var syntaxTree = parser.parse(cSource);
	console.log(util.inspect(syntaxTree, { depth: null }));
};

if (typeof module !== 'undefined' && require.main === module) {
	exports.main(process.argv);
}
