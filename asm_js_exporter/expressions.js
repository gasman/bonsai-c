var assert = require('assert');
var util = require('util');

var estree = require('./estree');
var asmJsTypes = require('./asm_js_types');
var cTypes = require('../abstractor/c_types');

function AddExpression(left, right, intendedType) {
	assert(intendedType.category == 'int',
		"Can't handle non-integer AddExpressions"
	);

	if (
		left.type.satisfies(asmJsTypes.int) ||
		(left.isAdditiveExpression && left.type.satisfies(asmJsTypes.intish))
	) {
		/* can skip coercion (integer addition supports chaining, despite the intermediate
			results being intish in principle) */
	} else {
		left = coerce(left, intendedType);
	}
	if (
		right.type.satisfies(asmJsTypes.int) ||
		(right.isAdditiveExpression && right.type.satisfies(asmJsTypes.intish))
	) {
		/* can skip coercion */
	} else {
		right = coerce(right, intendedType);
	}
	return {
		'tree': estree.BinaryExpression('+',
			wrapFunctionCall(left).tree,
			wrapFunctionCall(right).tree
		),
		'type': asmJsTypes.intish,
		'intendedType': intendedType,
		'isAdditiveExpression': true
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
		'type': right.type,
		'intendedType': left.intendedType
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
		'type': right.type,
		'intendedType': right.intendedType
	};
}
exports.CommaExpression = CommaExpression;

function ConstExpression(value, originalType) {
	var typ = null;
	if (originalType.category == 'int') {
		if (value >= 0 && value < 0x80000000) {
			typ = asmJsTypes.fixnum;
		} else {
			throw("Numeric literal out of range for signed int: %d" % value);
		}
	/* // TODO: reinstate when c_types has a concept of unsigned int...
	} else if (originalType.satisfies(asmJsTypes.unsigned)) {
		if (value >= 0 && value < 0x80000000) {
			typ = asmJsTypes.fixnum;
		} else if (value >= 0x80000000 && value < 0x100000000) {
			typ = asmJsTypes.unsigned;
		} else {
			throw("Numeric literal out of range for unsigned int: %d" % value);
		}
	*/
	} else {
		throw(
			util.format("Can't determine type of numeric literal: %s (reported: %s)",
				value, util.inspect(originalType)
			)
		);
	}

	return {
		'tree': estree.Literal(value),
		'type': typ,
		'intendedType': originalType,
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

	var intendedParamTypes = callee.intendedType.paramTypes;

	var argTrees = [];
	for (var i = 0; i < args.length; i++) {
		var arg = wrapFunctionCall(coerce(args[i], intendedParamTypes[i]));
		argTrees.push(arg.tree);
	}
	return {
		'tree': estree.CallExpression(callee.tree, argTrees),
		'type': callee.type.returnType,
		'intendedType': callee.intendedType.returnType,
		'isFunctionCall': true
	};
}
exports.FunctionCallExpression = FunctionCallExpression;

function RelationalExpression(operator, left, right, intendedOperandType) {
	assert(intendedOperandType.category == 'int',
		"Can't handle non-integer RelationalExpression"
	);

	left = coerce(left, intendedOperandType);
	right = coerce(right, intendedOperandType);

	return {
		'tree': estree.BinaryExpression(operator,
			wrapFunctionCall(left).tree,
			wrapFunctionCall(right).tree
		),
		'type': asmJsTypes.int,
		'intendedType': cTypes.int,
	};
}
function LessThanExpression(left, right, intendedOperandType) {
	return RelationalExpression('<', left, right, intendedOperandType);
}
exports.LessThanExpression = LessThanExpression;
function GreaterThanExpression(left, right, intendedOperandType) {
	return RelationalExpression('>', left, right, intendedOperandType);
}
exports.GreaterThanExpression = GreaterThanExpression;
function EqualExpression(left, right, intendedOperandType) {
	return RelationalExpression('==', left, right, intendedOperandType);
}
exports.EqualExpression = EqualExpression;

function PostincrementExpression(arg, resultIsUsed, out, context) {
	return PostupdateExpression(AddExpression, arg, resultIsUsed, out, context);
}
exports.PostincrementExpression = PostincrementExpression;

function PostdecrementExpression(arg, resultIsUsed, out, context) {
	return PostupdateExpression(SubtractExpression, arg, resultIsUsed, out, context);
}
exports.PostdecrementExpression = PostdecrementExpression;

function PostupdateExpression(internalOp, arg, resultIsUsed, out, context) {
	assert(arg.isIdentifier,
		"Argument of a postincrement expression must be an identifier - got " + util.inspect(arg)
	);

	if (resultIsUsed) {
		/* (arg)++ is equivalent to ((arg) = (tmp = (arg)) + 1), tmp */
		if (arg.type.satisfies(asmJsTypes.int)) {
			/* register a temp local var of type 'int' */
			var tempVariable = context.allocateLocalVariable('temp', asmJsTypes.int, arg.intendedType);
			out.variableDeclarations.push(
				estree.VariableDeclarator(
					estree.Identifier(tempVariable.name),
					estree.Literal(0)
				)
			);
			return CommaExpression(
				AssignmentExpression(
					arg,
					internalOp(
						AssignmentExpression(VariableExpression(tempVariable), arg),
						ConstExpression(1, cTypes.int),
						cTypes.int
					)
				),
				VariableExpression(tempVariable)
			);
		} else {
			throw("Don't know how to define a temp var for type: " + util.inspect(arg.type));
		}
	} else {
		/* (arg)++ is equivalent to (arg) = (arg) + 1 */
		return AssignmentExpression(
			arg,
			internalOp(arg, ConstExpression(1, cTypes.int), cTypes.int)
		);
	}
}

function SubtractExpression(left, right, intendedType) {
	assert(intendedType.category == 'int',
		"Can't handle non-integer SubtractExpressions"
	);

	if (
		left.type.satisfies(asmJsTypes.int) ||
		(left.isAdditiveExpression && left.type.satisfies(asmJsTypes.intish))
	) {
		/* can skip coercion (integer addition supports chaining, despite the intermediate
			results being intish in principle) */
	} else {
		left = coerce(left, intendedType);
	}
	if (
		right.type.satisfies(asmJsTypes.int) ||
		(right.isAdditiveExpression && right.type.satisfies(asmJsTypes.intish))
	) {
		/* can skip coercion */
	} else {
		right = coerce(right, intendedType);
	}

	return {
		'tree': estree.BinaryExpression('-',
			wrapFunctionCall(left).tree,
			wrapFunctionCall(right).tree
		),
		'type': asmJsTypes.intish,
		'intendedType': intendedType,
		'isAdditiveExpression': true
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

function getAsmJsType(typ) {
	/* get asm.js type corresponding to the given abstract type */
	if (typ.category == 'int') return asmJsTypes.signed;

	throw util.format(
		"Don't know how to convert abstract type %s to asm.js type",
		util.inspect(typ)
	);
}

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
			return AddExpression(left, right, expression.type);
		case 'AssignmentExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return AssignmentExpression(left, right);
		case 'CommaExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return CommaExpression(left, right);
		case 'ConstExpression':
			return ConstExpression(expression.value, expression.type);
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee, context, out);
			var args = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				args[i] = compileExpression(expression.parameters[i], context, out);
			}
			return FunctionCallExpression(callee, args);
		case 'LessThanExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return LessThanExpression(left, right, expression.operandType);
		case 'GreaterThanExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return GreaterThanExpression(left, right, expression.operandType);
		case 'EqualExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return EqualExpression(left, right, expression.operandType);
		case 'NegationExpression':
			arg = compileExpression(expression.argument, context, out);
			typ = null;
			if (arg.tree.type == 'Literal' && arg.tree.value > 0 && arg.tree.value <= 0x80000000) {
				typ = asmJsTypes.signed;
			} else if (arg.type.satisfies(asmJsTypes.int)) {
				typ = asmJsTypes.intish;
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
			return PostdecrementExpression(arg, expression.resultIsUsed, out, context);
		case 'PostincrementExpression':
			arg = compileExpression(expression.argument, context, out);
			return PostincrementExpression(arg, expression.resultIsUsed, out, context);
		case 'SubtractExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return SubtractExpression(left, right, expression.type);
		case 'VariableExpression':
			var variable = context.get(expression.variable.id);
			if (!variable) {
				throw "Variable not found: " + util.inspect(expression.variable);
			}
			return VariableExpression(variable);
		default:
			throw "Unexpected expression type: " + expression.expressionType;
	}
}

function coerce(expr, intendedType) {
	switch (intendedType.category) {
		case 'int': /* signed */
			if (expr.type.satisfies(asmJsTypes.signed)) {
				/* no coercion necessary */
				return expr;
			} else if (expr.type.satisfies(asmJsTypes.intish)) {
				/* coerce intish to signed using x | 0 */
				return {
					'tree': estree.BinaryExpression('|', expr.tree, estree.Literal(0)),
					'type': asmJsTypes.signed,
					'intendedType': intendedType
				};
			}
			break;
		default:
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

	if (expr.type.satisfies(asmJsTypes.signed)) {
		return {
			'tree': estree.BinaryExpression('|', expr.tree, estree.Literal(0)),
			'type': asmJsTypes.signed
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
