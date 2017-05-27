util = require('util');

exports.Node = function(typ, params) {
	this.type = typ;
	this.params = params;
};
exports.Node.prototype.inspect = function(depth) {
	var paramString = util.inspect(this.params, { depth: (depth === null ? null : depth - 1) });
	if (paramString.indexOf('\n') > -1) {
		/* reformat to put brackets on their own line */
		paramString = '[\n  ' + paramString.slice(2, -2) + '\n]';
	}
	return this.type + '(' + paramString + ')';
};
