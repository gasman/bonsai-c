/* convenience constructors for syntax tree objects to be used by escodegen */

exports.Program = function(body) {
	return {'type': 'Program', 'body': body};
};
