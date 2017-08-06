var assert = require('assert');
var util = require('util');

var types = require('./types');
var instructions = require('./instructions');

function compileExpression(expr, context, out, hints) {
	/* compile the code for evaluating 'expr' into 'out', and return the number of values
	pushed onto the stack; this will usually be 1, but may be 0 if the expression is a void
	function call or its resultIsUsed flag is false. */
	var i, localIndex;

	if (!hints) hints = {};

	if (expr.isCompileTimeConstant) {
		out.push(instructions.Const(
			types.fromCType(expr.type),
			expr.compileTimeConstantValue
		));
		return 1;
	}

	switch (expr.expressionType) {
		case 'AddExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int AddExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.Add(types.i32));
			return 1;
		case 'AddAssignmentExpression':
			assert.equal(expr.left.expressionType, 'VariableExpression');
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int AddAssignmentExpressions");
			localIndex = context.getIndex(expr.left.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.left.variable));
			}
			out.push(instructions.GetLocal(localIndex));
			compileExpression(expr.right, context, out);
			out.push(instructions.Add(types.i32));
			if (!expr.resultIsUsed && hints.canDiscardResult) {
				out.push(instructions.SetLocal(localIndex));
				return 0;
			} else {
				out.push(instructions.TeeLocal(localIndex));
				return 1;
			}
			break;
		case 'AssignmentExpression':
			assert.equal(expr.left.expressionType, 'VariableExpression');
			localIndex = context.getIndex(expr.left.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.left.variable));
			}
			compileExpression(expr.right, context, out);
			if (!expr.resultIsUsed && hints.canDiscardResult) {
				out.push(instructions.SetLocal(localIndex));
				return 0;
			} else {
				out.push(instructions.TeeLocal(localIndex));
				return 1;
			}
			break;
		case 'CommaExpression':
			var pushCount = compileExpression(expr.left, context, out, {
				canDiscardResult: true
			});
			/* drop any results that were pushed */
			for (j = 0; j < pushCount; j++) {
				out.push(instructions.Drop);
			}
			return compileExpression(expr.right, context, out, hints);
		case 'EqualExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int EqualExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.Eq(types.i32));
			return 1;
		case 'FunctionCallExpression':
			assert.equal(expr.callee.expressionType, 'VariableExpression');
			var functionVariable = expr.callee.variable;
			var functionIndex = context.globalContext.getFunctionIndex(functionVariable.id);
			if (functionIndex === null) {
				throw util.format("Function not found: %s", util.inspect(functionVariable));
			}
			for (i = 0; i < expr.parameters.length; i++) {
				compileExpression(expr.parameters[i], context, out);
			}
			out.push(instructions.Call(functionIndex));
			return (functionVariable.type.returnType.category == 'void') ? 0 : 1;
		case 'GreaterThanExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int GreaterThanExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.GtS(types.i32));
			return 1;
		case 'GreaterThanOrEqualExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int GreaterThanOrEqualExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.GeS(types.i32));
			return 1;
		case 'LessThanExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int LessThanExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.LtS(types.i32));
			return 1;
		case 'LessThanOrEqualExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int LessThanOrEqualExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.LeS(types.i32));
			return 1;
		case 'NotEqualExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int NotEqualExpressions");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.Ne(types.i32));
			return 1;
		case 'PostdecrementExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int PostdecrementExpression");
			assert.equal(expr.argument.expressionType, 'VariableExpression');
			localIndex = context.getIndex(expr.argument.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.argument.variable));
			}
			if (!expr.resultIsUsed && hints.canDiscardResult) {
				out.push(instructions.GetLocal(localIndex));
				out.push(instructions.Const(types.i32, 1));
				out.push(instructions.Sub(types.i32));
				out.push(instructions.SetLocal(localIndex));
				return 0;
			} else {
				out.push(instructions.GetLocal(localIndex));
				out.push(instructions.GetLocal(localIndex));
				out.push(instructions.Const(types.i32, 1));
				out.push(instructions.Sub(types.i32));
				out.push(instructions.SetLocal(localIndex));
				return 1;
			}
			break;
		case 'PostincrementExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int PostincrementExpression");
			assert.equal(expr.argument.expressionType, 'VariableExpression');
			localIndex = context.getIndex(expr.argument.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.argument.variable));
			}
			if (!expr.resultIsUsed && hints.canDiscardResult) {
				out.push(instructions.GetLocal(localIndex));
				out.push(instructions.Const(types.i32, 1));
				out.push(instructions.Add(types.i32));
				out.push(instructions.SetLocal(localIndex));
				return 0;
			} else {
				out.push(instructions.GetLocal(localIndex));
				out.push(instructions.GetLocal(localIndex));
				out.push(instructions.Const(types.i32, 1));
				out.push(instructions.Add(types.i32));
				out.push(instructions.SetLocal(localIndex));
				return 1;
			}
			break;
		case 'SubtractExpression':
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int SubtractExpression");
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			out.push(instructions.Sub(types.i32));
			return 1;
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

function compileStatement(statement, context, out) {
	var j, pushCount;

	switch(statement.statementType) {
		case 'BlockStatement':
			compile(statement.statements, context, out);
			break;
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
			pushCount = compileExpression(statement.expression, context, out, {
				canDiscardResult: true
			});
			/* drop any results that were pushed */
			for (j = 0; j < pushCount; j++) {
				out.push(instructions.Drop);
			}
			break;
		case 'ForStatement':
			/*
			'for (init; test; update) do_stuff' compiles to:

			init
			loop
				test
				if
					do_stuff
					update
					br 1  ; repeat loop
				end
			end
			*/
			compileStatement(statement.init, context, out);
			out.push(instructions.Loop);
			compileExpression(statement.test, context, out);
			out.push(instructions.If);
			compileStatement(statement.body, context, out);
			pushCount = compileExpression(statement.update, context, out, {
				canDiscardResult: true
			});
			/* drop any results that were pushed */
			for (j = 0; j < pushCount; j++) {
				out.push(instructions.Drop);
			}
			out.push(instructions.Br(1));
			out.push(instructions.End);
			out.push(instructions.End);
			break;
		case 'ReturnStatement':
			if (statement.expression !== null) {
				compileExpression(statement.expression, context, out);
			}
			/* TODO: omit the 'return' when it's the final statement */
			out.push(instructions.Return);
			break;
		case 'WhileStatement':
			/*
			'while (condition) do_stuff' compiles to:

			loop
				condition
				if
					do_stuff
					br 1  ; repeat loop
				end
			end
			*/

			out.push(instructions.Loop);
			compileExpression(statement.condition, context, out);
			out.push(instructions.If);
			compileStatement(statement.body, context, out);
			out.push(instructions.Br(1));
			out.push(instructions.End);
			out.push(instructions.End);
			break;
		default:
			throw util.format(
				"Unrecognised statement type %s: %s",
				statement.statementType,
				util.inspect(statement)
			);
	}
}

function compile(body, context, out) {
	for (var i = 0; i < body.length; i++) {
		compileStatement(body[i], context, out);
	}
}

exports.compile = compile;
