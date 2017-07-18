var assert = require('assert');
var util = require('util');

var estree = require('./estree');
var asmJsTypes = require('./asm_js_types');
var cTypes = require('../abstractor/c_types');

function AddExpression(left, right, intendedType) {
	if (intendedType.category == 'int') {
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
	} else if (intendedType.category == 'double') {
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('+',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.double,
			'intendedType': intendedType,
			'isAdditiveExpression': true
		};
	} else {
		throw(util.format(
			"Can't handle AddExpressions of type %s", util.inspect(intendedType)
		));
	}
}
exports.AddExpression = AddExpression;

function AddAssignmentExpression(left, right, intendedType) {
	assert(left.isRepeatable,
		"Left hand side of an add-assignment must be a repeatable expression - got " + util.inspect(left)
	);

	return AssignmentExpression(left,
		AddExpression(left, right, intendedType)
	);
}
exports.AddAssignmentExpression = AddAssignmentExpression;

function SubtractAssignmentExpression(left, right, intendedType) {
	assert(left.isRepeatable,
		"Left hand side of an add-assignment must be a repeatable expression - got " + util.inspect(left)
	);

	return AssignmentExpression(left,
		SubtractExpression(left, right, intendedType)
	);
}
exports.SubtractAssignmentExpression = SubtractAssignmentExpression;

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
		'intendedType': left.intendedType,
		'isPureBoolean': right.isPureBoolean
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
		'intendedType': right.intendedType,
		'isPureBoolean': right.isPureBoolean
	};
}
exports.CommaExpression = CommaExpression;

function ConditionalExpression(test, consequent, alternate, intendedType) {
	assert(intendedType.category == 'int',
		"Can't handle non-integer ConditionalExpression"
	);
	var resultType = asmJsTypes.int;

	if (!test.type.satisfies(asmJsTypes.int)) {
		test = coerce(test, cTypes.int);
	}
	if (!consequent.type.satisfies(resultType)) {
		consequent = coerce(consequent, intendedType);
	}
	if (!alternate.type.satisfies(resultType)) {
		alternate = coerce(alternate, intendedType);
	}

	return {
		'tree': estree.ConditionalExpression(
			wrapFunctionCall(test).tree,
			wrapFunctionCall(consequent).tree,
			wrapFunctionCall(alternate).tree
		),
		'type': resultType,
		'intendedType': intendedType,
		'isPureBoolean': consequent.isPureBoolean && alternate.isPureBoolean
	};
}
exports.ConditionalExpression = ConditionalExpression;

function ConstExpression(value, originalType) {
	var typ = null;
	var tree;
	if (originalType.category == 'int') {
		if (value >= 0 && value < 0x80000000) {
			typ = asmJsTypes.fixnum;
		} else {
			throw("Numeric literal out of range for signed int: %d" % value);
		}
		tree = estree.Literal(value);
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
	} else if (originalType.category == 'double') {
		typ = asmJsTypes.double;
		var valueString = value.toString();
		if (valueString.indexOf('.') == -1) {
			valueString += '.0';
		}
		tree = estree.RawLiteral(value, valueString);
	} else {
		throw(
			util.format("Can't determine type of numeric literal: %s (reported: %s)",
				value, util.inspect(originalType)
			)
		);
	}

	return {
		'tree': tree,
		'type': typ,
		'intendedType': originalType,
		'isDirectNumericLiteral': true,
		'isNumericLiteral': true,
		'numericLiteralValue': value,
		'isRepeatable': true,
		'isPureBoolean': (value === 0 || value === 1)
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

function LogicalAndExpression(left, right, resultIsUsed, resultIsUsedAsBoolean) {
	/* asm.js does not provide logical AND; fake it with a conditional instead.
	a && b  is equivalent to:  a ? !!b : 0
	If b is known to be pure boolean, or the result will only be used in a boolean context,
	the !! can be omitted
	*/

	if (resultIsUsed && !resultIsUsedAsBoolean && !right.isPureBoolean) {
		right = LogicalNotExpression(LogicalNotExpression(right));
	}
	return ConditionalExpression(
		left,
		right,
		ConstExpression(0, cTypes.int),
		cTypes.int
	);
}
exports.LogicalAndExpression = LogicalAndExpression;

function LogicalNotExpression(arg) {
	if (!arg.type.satisfies(asmJsTypes.int)) {
		arg = coerce(arg, intendedType);
	}

	return {
		'tree': estree.UnaryExpression('!',
			wrapFunctionCall(arg).tree
		),
		'type': asmJsTypes.int,
		'intendedType': cTypes.int,
		'isPureBoolean': true
	};
}
exports.LogicalNotExpression = LogicalNotExpression;

function LogicalOrExpression(left, right, resultIsUsed, resultIsUsedAsBoolean) {
	/* asm.js does not provide logical OR; fake it with a conditional instead.
	a || b  is equivalent to:  a ? 1 : !!b
	*/

	if (resultIsUsed && !resultIsUsedAsBoolean && !right.isPureBoolean) {
		right = LogicalNotExpression(LogicalNotExpression(right));
	}
	return ConditionalExpression(
		left,
		ConstExpression(1, cTypes.int),
		right,
		cTypes.int
	);
}
exports.LogicalOrExpression = LogicalOrExpression;

function MultiplyExpression(left, right, intendedType) {
	if (intendedType.category == 'double') {
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('*',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.double,
			'intendedType': intendedType,
		};
	} else {
		throw(util.format(
			"Can't handle MultiplyExpressions of type %s", util.inspect(intendedType)
		));
	}
}
exports.MultiplyExpression = MultiplyExpression;

function DivideExpression(left, right, intendedType) {
	if (intendedType.category == 'double') {
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('/',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.double,
			'intendedType': intendedType,
		};
	} else {
		throw(util.format(
			"Can't handle DivideExpressions of type %s", util.inspect(intendedType)
		));
	}
}
exports.DivideExpression = DivideExpression;

function RelationalExpression(operator, left, right, intendedOperandType) {
	assert(intendedOperandType.category == 'int' || intendedOperandType.category == 'double',
		util.format(
			"Can't handle RelationalExpression of type: %s", util.inspect(intendedOperandType)
		)
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
		'isPureBoolean': true
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
function NotEqualExpression(left, right, intendedOperandType) {
	return RelationalExpression('!=', left, right, intendedOperandType);
}
exports.NotEqualExpression = NotEqualExpression;
function LessThanOrEqualExpression(left, right, intendedOperandType) {
	return RelationalExpression('<=', left, right, intendedOperandType);
}
exports.LessThanOrEqualExpression = LessThanOrEqualExpression;
function GreaterThanOrEqualExpression(left, right, intendedOperandType) {
	return RelationalExpression('>=', left, right, intendedOperandType);
}
exports.GreaterThanOrEqualExpression = GreaterThanOrEqualExpression;

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
			var tempVariable = context.declareLocalVariable('temp', null, arg.intendedType, null, out);
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
		'isValidAsLvalue': true,
		'isRepeatable': true
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
		case 'AddAssignmentExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return AddAssignmentExpression(left, right, expression.type);
		case 'SubtractAssignmentExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return SubtractAssignmentExpression(left, right, expression.type);
		case 'AssignmentExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return AssignmentExpression(left, right);
		case 'CommaExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return CommaExpression(left, right);
		case 'ConditionalExpression':
			var test = compileExpression(expression.test, context, out);
			var consequent = compileExpression(expression.consequent, context, out);
			var alternate = compileExpression(expression.alternate, context, out);
			return ConditionalExpression(test, consequent, alternate, expression.type);
		case 'ConstExpression':
			return ConstExpression(expression.value, expression.type);
		case 'DivideExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return DivideExpression(left, right, expression.type);
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee, context, out);
			var args = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				args[i] = compileExpression(expression.parameters[i], context, out);
			}
			return FunctionCallExpression(callee, args);
		case 'LogicalAndExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return LogicalAndExpression(left, right, expression.resultIsUsed, expression.resultIsUsedAsBoolean);
		case 'LogicalNotExpression':
			arg = compileExpression(expression.argument, context, out);
			return LogicalNotExpression(arg);
		case 'LogicalOrExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return LogicalOrExpression(left, right, expression.resultIsUsed, expression.resultIsUsedAsBoolean);
		case 'MultiplyExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return MultiplyExpression(left, right, expression.type);
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
		case 'NotEqualExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return NotEqualExpression(left, right, expression.operandType);
		case 'LessThanOrEqualExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return LessThanOrEqualExpression(left, right, expression.operandType);
		case 'GreaterThanOrEqualExpression':
			left = compileExpression(expression.left, context, out);
			right = compileExpression(expression.right, context, out);
			return GreaterThanOrEqualExpression(left, right, expression.operandType);
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
					'intendedType': intendedType,
					'isPureBoolean': expr.isPureBoolean
				};
			}
			break;
		case 'double':
			if (expr.type.satisfies(asmJsTypes.double)) {
				/* no coercion necessary */
				return expr;
			} else {
				throw(
					util.format("Don't know how to coerce expression %s to double",
						util.inspect(expr)
					)
				);
			}
			break;
		default:
			throw(
				util.format("Don't know how to coerce expression %s to type %s",
					util.inspect(expr),
					util.inspect(intendedType)
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
			'type': asmJsTypes.signed,
			'isPureBoolean': expr.isPureBoolean
		};
	} else if (expr.type.satisfies(asmJsTypes.double)) {
		return {
			'tree': estree.UnaryExpression('+', expr.tree),
			'type': asmJsTypes.double
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
