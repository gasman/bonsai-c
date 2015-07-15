var fs = require("fs");
var util = require('util');

var parser = require("./parser").parser;
parser.yy = require("./ast");

var cSource = fs.readFileSync(process.argv[2], "utf8");
var ast = parser.parse(cSource);

console.log(util.inspect(ast, { depth: null }));
