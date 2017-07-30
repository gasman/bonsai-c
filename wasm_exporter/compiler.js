var util = require('util');

var types = require('./types');
var instructions = require('./instructions');

function compileExpression(expr, out) {
	if (expr.isCompileTimeConstant) {
		out.push(instructions.Const(
			types.fromCType(expr.type),
			expr.compileTimeConstantValue
		));
		return;
	}

	switch (expr.expressionType) {
		default:
			throw util.format(
				"Unrecognised expression type %s: %s",
				expr.expressionType,
				util.inspect(expr)
			);
	}

}

function compile(body, out) {
	for (var i = 0; i < body.length; i++) {
		var statement = body[i];
		switch(statement.statementType) {
			case 'ReturnStatement':
				if (statement.expression !== null) {
					compileExpression(statement.expression, out);
				}
				/* TODO: omit the 'return' when it's the final statement */
				out.push(instructions.Return);
				break;
			default:
				throw util.format(
					"Unrecognised statement type %s: %s",
					statement.statementType,
					util.inspect(statement)
				);
		}
	}
}

exports.compile = compile;
