var assert = require('assert');
var util = require('util');

var estree = require('./estree');
var types = require('./types');

function compileExpression(expression, context) {
	var left, right, arg, typ;

	switch(expression.expressionType) {
		case 'AddExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			if (left.type.satisfies(types.int) && right.type.satisfies(types.int)) {
				typ = types.intish;
			} else {
				throw(
					util.format("Can't handle AddExpression with operand types %s and %s",
						util.inspect(left.type),
						util.inspect(right.type)
					)
				);
			}
			return {
				'tree': estree.BinaryExpression('+', left.tree, right.tree),
				'type': typ
			};
		case 'AssignmentExpression':
			left = compileExpression(expression.left, context);
			assert(left.isValidAsLvalue,
				"Left hand side of an assignment must be a valid lvalue - got " + util.inspect(left)
			);

			right = coerce(
				compileExpression(expression.right, context),
				left.intendedType
			);

			return {
				'tree': estree.AssignmentExpression('=', left.tree, right.tree),
				'type': right.type
			};
		case 'ConstExpression':
			typ = null;
			/* FIXME: Should infer type from the numeric form in the original source code;
			e.g. 10.0 should be treated as a float/double, not an integer */
			if (Number.isInteger(expression.value)) {
				if (expression.value >= 0 && expression.value < 0x80000000) {
					typ = types.fixnum;
				} else if (expression.value >= 0x80000000 && expression.value < 0x100000000) {
					typ = types.unsigned;
				}
			}
			if (typ === null) {
				throw("Can't determine type of numeric literal: " + expression.value);
			}
			return {
				'tree': estree.Literal(expression.value),
				'type': typ,
				'isDirectNumericLiteral': true,
				'isNumericLiteral': true,
				'numericLiteralValue': expression.value
			};
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee, context);

			assert(callee.isIdentifier,
				"Callee of a function call must be an identifier - got " + util.inspect(callee)
			);

			var expectedParamTypes = callee.type.paramTypes;

			var argTrees = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				arg = coerce(
					compileExpression(expression.parameters[i], context),
					expectedParamTypes[i]
				);
				argTrees.push(arg.tree);
			}
			return {
				'tree': estree.CallExpression(callee.tree, argTrees),
				'type': callee.type.returnType
			};
		case 'NegationExpression':
			arg = compileExpression(expression.argument, context);
			typ = null;
			if (arg.tree.type == 'Literal' && arg.tree.value > 0 && arg.tree.value <= 0x80000000) {
				typ = types.signed;
			} else if (arg.type.satisfies(types.int)) {
				typ = types.intish;
			} else {
				throw("Can't handle a NegationExpression with arg type: " + util.inspect(arg.type));
			}

			if (arg.isDirectNumericLiteral) {
				return {
					'tree': estree.UnaryExpression('-', arg.tree, true),
					'type': typ,
					'isNumericLiteral': true,
					'numericLiteralValue': -(arg.numericLiteralValue)
				};
			} else {
				return {
					'tree': estree.UnaryExpression('-', arg.tree, true),
					'type': typ
				};
			}
			break;
		case 'VariableExpression':
			var variable = context.localVariablesById[expression.variable.id];
			if (!variable) {
				variable = context.globalContext.globalVariablesById[expression.variable.id];

				if (!variable) {
					throw "Variable not found: " + util.inspect(expression.variable);
				}
			}
			return {
				'tree': estree.Identifier(variable.name),
				'type': variable.type,
				'intendedType': variable.intendedType,
				'isIdentifier': true,
				'isValidAsLvalue': true
			};
		default:
			throw "Unexpected expression type: " + expression.expressionType;
	}
}

function coerce(expr, targetType) {
	if (expr.type.satisfies(targetType)) {
		return expr;
	} else if (expr.type.satisfies(types.intish) && types.signed.satisfies(targetType)) {
		/* coerce intish to signed using x | 0 */
		return {
			'tree': estree.BinaryExpression('|', expr.tree, estree.Literal(0)),
			'type': types.signed
		};
	} else {
		throw(
			util.format("Don't know how to coerce expression %s to type %s",
				util.inspect(expr),
				util.inspect(targetType)
			)
		);
	}
}

exports.compileExpression = compileExpression;
