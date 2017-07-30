var assert = require('assert');
var util = require('util');

var types = require('./types');
var instructions = require('./instructions');

function compileExpression(expr, context, out) {
	/* compile the code for evaluating 'expr' into 'out', and return the number of values
	pushed onto the stack; this will usually be 1, but may be 0 if the expression is a void
	function call or its resultIsUsed flag is false. */
	var localIndex;

	if (expr.isCompileTimeConstant) {
		out.push(instructions.Const(
			types.fromCType(expr.type),
			expr.compileTimeConstantValue
		));
		return 1;
	}

	switch (expr.expressionType) {
		case 'AssignmentExpression':
			assert.equal(expr.left.expressionType, 'VariableExpression');
			localIndex = context.getIndex(expr.left.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.left.variable));
			}
			compileExpression(expr.right, context, out);
			if (expr.resultIsUsed) {
				out.push(instructions.TeeLocal(localIndex));
				return 1;
			} else {
				out.push(instructions.SetLocal(localIndex));
				return 0;
			}
		case 'VariableExpression':
			localIndex = context.getIndex(expr.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.variable));
			}
			out.push(instructions.GetLocal(localIndex));
			return 1;
		default:
			throw util.format(
				"Unrecognised expression type %s: %s",
				expr.expressionType,
				util.inspect(expr)
			);
	}

}

function compile(body, context, out) {
	var j;
	for (var i = 0; i < body.length; i++) {
		var statement = body[i];
		switch(statement.statementType) {
			case 'DeclarationStatement':
				for (j = 0; j < statement.variableDeclarations.length; j++) {
					var variableDeclaration = statement.variableDeclarations[j];
					var variable = variableDeclaration.variable;
					var index = context.declareVariable(variable.id, types.fromCType(variable.type));
					if (variableDeclaration.initialValueExpression !== null) {
						compileExpression(variableDeclaration.initialValueExpression, context, out);
						out.push(instructions.SetLocal(index));
					}
				}
				break;
			case 'ExpressionStatement':
				var pushCount = compileExpression(statement.expression, context, out);
				/* drop any results that were pushed */
				for (j = 0; j < pushCount; j++) {
					out.push(instructions.Drop);
				}
				break;
			case 'ReturnStatement':
				if (statement.expression !== null) {
					compileExpression(statement.expression, context, out);
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
