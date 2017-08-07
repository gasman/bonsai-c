var assert = require('assert');
var util = require('util');

var types = require('./types');
var instructions = require('./instructions');

function compileExpression(expr, context, out, hints) {
	/* compile the code for evaluating 'expr' into 'out', and return the number of values
	pushed onto the stack; this will usually be 1, but may be 0 if the expression is a void
	function call or its resultIsUsed flag is false. */
	var i, localIndex, resultIndex;

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
		case 'ConditionalExpression':
			/* The blocks within an 'if' must balance the stack, and so
			can't leave a result behind; we need to store it in a local var
			instead */
			resultIndex = context.declareVariable(null, types.fromCType(expr.type));
			compileExpression(expr.test, context, out);
			out.push(instructions.If);
			compileExpression(expr.consequent, context, out);
			out.push(instructions.SetLocal(resultIndex));
			out.push(instructions.Else);
			compileExpression(expr.alternate, context, out);
			out.push(instructions.SetLocal(resultIndex));
			out.push(instructions.End);
			out.push(instructions.GetLocal(resultIndex));
			return 1;
		case 'EqualExpression':
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			if (expr.left.type.category == 'int' && expr.right.type.category == 'int') {
				out.push(instructions.Eq(types.i32));
			} else if (expr.left.type.category == 'double' && expr.right.type.category == 'double') {
				out.push(instructions.Eq(types.f64));
			} else {
				throw util.format("Don't know how to handle EqualExpressions of types: %s, %s",
					util.inspect(expr.left.type), util.inspect(expr.right.type)
				);
			}
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
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			if (expr.left.type.category == 'int' && expr.right.type.category == 'int') {
				out.push(instructions.GtS(types.i32));
			} else if (expr.left.type.category == 'double' && expr.right.type.category == 'double') {
				out.push(instructions.Gt(types.f64));
			} else {
				throw util.format("Don't know how to handle GreaterThanExpressions of types: %s, %s",
					util.inspect(expr.left.type), util.inspect(expr.right.type)
				);
			}
			return 1;
		case 'GreaterThanOrEqualExpression':
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			if (expr.left.type.category == 'int' && expr.right.type.category == 'int') {
				out.push(instructions.GeS(types.i32));
			} else if (expr.left.type.category == 'double' && expr.right.type.category == 'double') {
				out.push(instructions.Ge(types.f64));
			} else {
				throw util.format("Don't know how to handle GreaterThanOrEqualExpressions of types: %s, %s",
					util.inspect(expr.left.type), util.inspect(expr.right.type)
				);
			}
			return 1;
		case 'LessThanExpression':
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			if (expr.left.type.category == 'int' && expr.right.type.category == 'int') {
				out.push(instructions.LtS(types.i32));
			} else if (expr.left.type.category == 'double' && expr.right.type.category == 'double') {
				out.push(instructions.Lt(types.f64));
			} else {
				throw util.format("Don't know how to handle LessThanExpressions of types: %s, %s",
					util.inspect(expr.left.type), util.inspect(expr.right.type)
				);
			}
			return 1;
		case 'LessThanOrEqualExpression':
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			if (expr.left.type.category == 'int' && expr.right.type.category == 'int') {
				out.push(instructions.LeS(types.i32));
			} else if (expr.left.type.category == 'double' && expr.right.type.category == 'double') {
				out.push(instructions.Le(types.f64));
			} else {
				throw util.format("Don't know how to handle LessThanOrEqualExpressions of types: %s, %s",
					util.inspect(expr.left.type), util.inspect(expr.right.type)
				);
			}
			return 1;
		case 'LogicalAndExpression':
			/* left && right compiles to:
			left
			if
				right
				i32.eqz
				i32.eqz
				set_local result
			else
				i32.const 0
				set_local result
			end
			get_local result
			*/
			assert.equal(expr.left.type.category, 'int');
			assert.equal(expr.right.type.category, 'int');

			resultIndex = context.declareVariable(null, types.fromCType(expr.type));

			compileExpression(expr.left, context, out);
			out.push(instructions.If);
			compileExpression(expr.right, context, out);
			out.push(instructions.Eqz(types.i32));
			out.push(instructions.Eqz(types.i32));
			out.push(instructions.SetLocal(resultIndex));
			out.push(instructions.Else);
			out.push(instructions.Const(types.i32, 0));
			out.push(instructions.SetLocal(resultIndex));
			out.push(instructions.End);
			out.push(instructions.GetLocal(resultIndex));
			break;
		case 'LogicalNotExpression':
			assert.equal(expr.argument.type.category, 'int', "Don't know how to handle non-int LogicalNotExpressions");
			compileExpression(expr.argument, context, out);
			/* logical not is equivalent to 'equals zero' */
			out.push(instructions.Eqz(types.i32));
			return 1;
		case 'NotEqualExpression':
			compileExpression(expr.left, context, out);
			compileExpression(expr.right, context, out);
			if (expr.left.type.category == 'int' && expr.right.type.category == 'int') {
				out.push(instructions.Ne(types.i32));
			} else if (expr.left.type.category == 'double' && expr.right.type.category == 'double') {
				out.push(instructions.Ne(types.f64));
			} else {
				throw util.format("Don't know how to handle NotEqualExpressions of types: %s, %s",
					util.inspect(expr.left.type), util.inspect(expr.right.type)
				);
			}
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
		case 'SubtractAssignmentExpression':
			assert.equal(expr.left.expressionType, 'VariableExpression');
			assert.equal(expr.type.category, 'int', "Don't know how to handle non-int SubtractAssignmentExpressions");
			localIndex = context.getIndex(expr.left.variable.id);
			if (localIndex === null) {
				throw util.format("Variable not found: %s", util.inspect(expr.left.variable));
			}
			out.push(instructions.GetLocal(localIndex));
			compileExpression(expr.right, context, out);
			out.push(instructions.Sub(types.i32));
			if (!expr.resultIsUsed && hints.canDiscardResult) {
				out.push(instructions.SetLocal(localIndex));
				return 0;
			} else {
				out.push(instructions.TeeLocal(localIndex));
				return 1;
			}
			break;
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

function compileStatement(statement, context, out, breakDepth, continueDepth) {
	var j, pushCount;

	switch(statement.statementType) {
		case 'BlockStatement':
			compile(statement.statements, context, out, breakDepth, continueDepth);
			break;
		case 'BreakStatement':
			assert(breakDepth !== null);
			out.push(instructions.Br(breakDepth));
			break;
		case 'ContinueStatement':
			assert(continueDepth !== null);
			out.push(instructions.Br(continueDepth));
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
			block  ; required for 'break'
				loop
					test
					if
						block ; required for 'continue'
							do_stuff
							; break statements here need 'br 3'
							; continue statements here need 'br 0'
						end
						update
						br 1  ; repeat loop
					end
				end
			end

			'for (init; ; update) do_stuff' compiles to:
			init
			block  ; only required for 'break'
				loop
					block ; required for 'continue'
						do_stuff
						; break statements here need 'br 2'
						; continue statements here need 'br 0'
					end
					update
					br 0  ; repeat loop
				end
			end
			*/
			compileStatement(statement.init, context, out, null, null);
			out.push(instructions.Block);
			out.push(instructions.Loop);
			if (statement.test) {
				compileExpression(statement.test, context, out);
				out.push(instructions.If);
				out.push(instructions.Block);
				compileStatement(statement.body, context, out, 3, 0);
				out.push(instructions.End);

				if (statement.update) {
					pushCount = compileExpression(statement.update, context, out, {
						canDiscardResult: true
					});
					/* drop any results that were pushed */
					for (j = 0; j < pushCount; j++) {
						out.push(instructions.Drop);
					}
				}

				out.push(instructions.Br(1));
				out.push(instructions.End);
			} else {
				out.push(instructions.Block);
				compileStatement(statement.body, context, out, 2, 0);
				out.push(instructions.End);

				if (statement.update) {
					pushCount = compileExpression(statement.update, context, out, {
						canDiscardResult: true
					});
					/* drop any results that were pushed */
					for (j = 0; j < pushCount; j++) {
						out.push(instructions.Drop);
					}
				}

				out.push(instructions.Br(0));
			}
			out.push(instructions.End);
			out.push(instructions.End);
			break;
		case 'IfStatement':
			compileExpression(statement.test, context, out);
			out.push(instructions.If);
			var innerBreakDepth = (breakDepth === null ? null : breakDepth + 1);
			var innerContinueDepth = (continueDepth === null ? null : continueDepth + 1);
			compileStatement(statement.thenStatement, context, out, innerBreakDepth, innerContinueDepth);
			if (statement.elseStatement) {
				out.push(instructions.Else);
				compileStatement(statement.elseStatement, context, out, innerBreakDepth, innerContinueDepth);
			}
			out.push(instructions.End);
			break;
		case 'NullStatement':
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

			block
				loop
					condition
					if
						do_stuff
						; break statements here need 'br 2'
						; continue statements here need 'br 1'
						br 1  ; repeat loop
					end
				end
			end
			*/

			out.push(instructions.Block);
			out.push(instructions.Loop);
			compileExpression(statement.condition, context, out);
			out.push(instructions.If);
			compileStatement(statement.body, context, out, 2, 1);
			out.push(instructions.Br(1));
			out.push(instructions.End);
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

function compile(body, context, out, breakDepth, continueDepth) {
	for (var i = 0; i < body.length; i++) {
		compileStatement(body[i], context, out, breakDepth, continueDepth);
	}
}

exports.compile = compile;
