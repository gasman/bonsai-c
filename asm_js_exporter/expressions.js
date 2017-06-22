var assert = require('assert');
var util = require('util');

var estree = require('./estree');
var types = require('./types');

function AddExpression(left, right) {
	var typ;
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
		'tree': estree.BinaryExpression('+',
			wrapFunctionCall(left).tree,
			wrapFunctionCall(right).tree
		),
		'type': typ
	};
}
exports.AddExpression = AddExpression;

function AssignmentExpression(left, right) {
	assert(left.isValidAsLvalue,
		"Left hand side of an assignment must be a valid lvalue - got " + util.inspect(left)
	);

	right = coerce(right, left.intendedType);

	return {
		'tree': estree.AssignmentExpression('=',
			left.tree,
			wrapFunctionCall(right).tree
		),
		'type': right.type
	};
}
exports.AssignmentExpression = AssignmentExpression;

function CommaExpression(left, right) {
	return {
		'tree': estree.SequenceExpression([
			left.tree,
			wrapFunctionCall(right).tree
			/* FIXME: avoid wrapFunctionCall if this is a chained comma expression and this isn't the last one */
		]),
		'type': right.type
	};
}
exports.CommaExpression = CommaExpression;

function ConstExpression(value) {
	var typ = null;
	/* FIXME: Should infer type from the numeric form in the original source code;
	e.g. 10.0 should be treated as a float/double, not an integer */
	if (Number.isInteger(value)) {
		if (value >= 0 && value < 0x80000000) {
			typ = types.fixnum;
		} else if (value >= 0x80000000 && value < 0x100000000) {
			typ = types.unsigned;
		}
	}
	if (typ === null) {
		throw("Can't determine type of numeric literal: " + value);
	}
	return {
		'tree': estree.Literal(value),
		'type': typ,
		'isDirectNumericLiteral': true,
		'isNumericLiteral': true,
		'numericLiteralValue': value
	};
}
exports.ConstExpression = ConstExpression;

function FunctionCallExpression(callee, args) {
	assert(callee.isIdentifier,
		"Callee of a function call must be an identifier - got " + util.inspect(callee)
	);

	var expectedParamTypes = callee.type.paramTypes;

	var argTrees = [];
	for (var i = 0; i < args.length; i++) {
		var arg = wrapFunctionCall(coerce(args[i], expectedParamTypes[i]));
		argTrees.push(arg.tree);
	}
	return {
		'tree': estree.CallExpression(callee.tree, argTrees),
		'type': callee.type.returnType,
		'isFunctionCall': true
	};
}
exports.FunctionCallExpression = FunctionCallExpression;

function PostdecrementExpression(arg) {
	assert(arg.isIdentifier,
		"Argument of a postdecrement expression must be an identifier - got " + util.inspect(arg)
	);

	return AssignmentExpression(arg, SubtractExpression(arg, ConstExpression(1)));
}
exports.PostdecrementExpression = PostdecrementExpression;

function PostincrementExpression(arg, resultIsUsed, out) {
	assert(arg.isIdentifier,
		"Argument of a postincrement expression must be an identifier - got " + util.inspect(arg)
	);

	if (resultIsUsed) {
		/* (arg)++ is equivalent to ((arg) = (tmp = (arg)) + 1), tmp */
		if (arg.type.satisfies(types.int)) {
			/* register as a local var of type 'int' */
			var tempVariable = {
				'name': 'temp', /* FIXME: allocate an unused variable name */
				'type': types.int,
				'intendedType': arg.intendedType
			};
			out.variableDeclarations.push(
				estree.VariableDeclarator(
					estree.Identifier(tempVariable.name),
					estree.Literal(0)
				)
			);
			return CommaExpression(
				AssignmentExpression(
					arg,
					AddExpression(
						AssignmentExpression(VariableExpression(tempVariable), arg),
						ConstExpression(1)
					)
				),
				VariableExpression(tempVariable)
			);
		} else {
			throw("Don't know how to define a temp var for type: " + util.inspect(arg.type));
		}
	} else {
		/* (arg)++ is equivalent to (arg) = (arg) + 1 */
		return AssignmentExpression(arg, AddExpression(arg, ConstExpression(1)));
	}
}
exports.PostincrementExpression = PostincrementExpression;

function SubtractExpression(left, right) {
	var typ;
	if (left.type.satisfies(types.int) && right.type.satisfies(types.int)) {
		typ = types.intish;
	} else {
		throw(
			util.format("Can't handle SubtractExpression with operand types %s and %s",
				util.inspect(left.type),
				util.inspect(right.type)
			)
		);
	}
	return {
		'tree': estree.BinaryExpression('-',
			wrapFunctionCall(left).tree,
			wrapFunctionCall(right).tree
		),
		'type': typ
	};
}
exports.SubtractExpression = SubtractExpression;

function VariableExpression(variable) {
	return {
		'tree': estree.Identifier(variable.name),
		'type': variable.type,
		'intendedType': variable.intendedType,
		'isIdentifier': true,
		'isValidAsLvalue': true
	};
}
exports.VariableExpression = VariableExpression;

function compileExpression(expression, context, out) {
	/* out = the output stream for the function currently being compiled.
	compileExpression _must not_ write to out.body
	(the expression estree should be returned in result.tree instead),
	but _can_ write to out.variableDeclarations if it needs to declare a variable
	for intermediate value storage */
	var left, right, arg, typ;

	switch(expression.expressionType) {
		case 'AddExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return AddExpression(left, right);
		case 'AssignmentExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return AssignmentExpression(left, right);
		case 'CommaExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return CommaExpression(left, right);
		case 'ConstExpression':
			return ConstExpression(expression.value);
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee, context, out);
			var args = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				args[i] = compileExpression(expression.parameters[i], context, out);
			}
			return FunctionCallExpression(callee, args);
		case 'NegationExpression':
			arg = compileExpression(expression.argument, context, out);
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
					'tree': estree.UnaryExpression('-', wrapFunctionCall(arg).tree, true),
					'type': typ
				};
			}
			break;
		case 'PostdecrementExpression':
			arg = compileExpression(expression.argument, context, out);
			return PostdecrementExpression(arg);
		case 'PostincrementExpression':
			arg = compileExpression(expression.argument, context, out);
			return PostincrementExpression(arg, expression.resultIsUsed, out);
		case 'SubtractExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return SubtractExpression(left, right);
		case 'VariableExpression':
			var variable = context.localVariablesById[expression.variable.id];
			if (!variable) {
				variable = context.globalContext.globalVariablesById[expression.variable.id];

				if (!variable) {
					throw "Variable not found: " + util.inspect(expression.variable);
				}
			}
			return VariableExpression(variable);
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

function wrapFunctionCall(expr) {
	/* asm.js only allows function calls to be used in limited contexts, mostly ones that
	look like coercion expressions (foo() | 0 etc). In the cases where they aren't allowed,
	call this to wrap it in a suitable do-nothing coercion */
	if (!expr.isFunctionCall) return expr;

	if (expr.type.satisfies(types.signed)) {
		return {
			'tree': estree.BinaryExpression('|', expr.tree, estree.Literal(0)),
			'type': types.signed
		};
	} else {
		throw(
			util.format("Don't know how to wrap function call of type %s",
				util.inspect(expr.type)
			)
		);
	}
}

exports.compileExpression = compileExpression;
