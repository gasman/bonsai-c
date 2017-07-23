var assert = require('assert');
var util = require('util');

var estree = require('./estree');
var asmJsTypes = require('./asm_js_types');
var cTypes = require('../abstractor/c_types');

function AddExpression(left, right, intendedType, context) {
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
	} else if (intendedType.category == 'pointer') {
		if (left.intendedType.category == 'pointer') {
			/* pointer + int: a + b => a + (b * sizeOf(targetType)) */
			assert(right.intendedType == cTypes.int);

			right = MultiplyExpression(
				right,
				ConstExpression(intendedType.targetType.size, cTypes.int),
				cTypes.int, context
			);

			return {
				'tree': estree.BinaryExpression('+',
					wrapFunctionCall(left).tree,
					wrapFunctionCall(right).tree
				),
				'type': asmJsTypes.intish,
				'intendedType': intendedType,
				'isAdditiveExpression': true
			};

		} else {
			/* int + pointer: a + b => (a * sizeOf(targetType)) + b */
			assert(left.intendedType == cTypes.int);
			assert(right.intendedType.category == 'pointer');

			left = MultiplyExpression(
				left,
				ConstExpression(intendedType.targetType.size, cTypes.int),
				cTypes.int, context
			);

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
	} else {
		throw(util.format(
			"Can't handle AddExpressions of type %s", util.inspect(intendedType)
		));
	}
}
exports.AddExpression = AddExpression;

function AddAssignmentExpression(left, right, intendedType, context) {
	assert(left.isRepeatable,
		"Left hand side of an add-assignment must be a repeatable expression - got " + util.inspect(left)
	);

	return AssignmentExpression(left,
		AddExpression(left, right, intendedType, context)
	);
}
exports.AddAssignmentExpression = AddAssignmentExpression;

function SubtractAssignmentExpression(left, right, intendedType, context) {
	assert(left.isRepeatable,
		"Left hand side of an add-assignment must be a repeatable expression - got " + util.inspect(left)
	);

	return AssignmentExpression(left,
		SubtractExpression(left, right, intendedType, context)
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
		} else if (value >= -0x80000000 && value < 0) {
			typ = asmJsTypes.signed;
		} else {
			throw("Numeric literal out of range for signed int: %d" % value);
		}
		if (value < 0) {
			tree = estree.UnaryExpression('-', estree.Literal(-value));
		} else {
			tree = estree.Literal(value);
		}
	} else if (originalType.category == 'pointer') {
		/* also use this for unsigned int, when we've implemented that... */
		if (value >= 0 && value < 0x80000000) {
			typ = asmJsTypes.fixnum;
		} else if (value >= 0x80000000 && value < 0x100000000) {
			typ = asmJsTypes.unsigned;
		} else {
			throw("Numeric literal out of range for unsigned int: %d" % value);
		}
		tree = estree.Literal(value);
	} else if (originalType.category == 'double') {
		typ = asmJsTypes.double;
		var valueString = Math.abs(value).toString();
		if (valueString.indexOf('.') == -1) {
			valueString += '.0';
		}
		if (value < 0) {
			tree = estree.UnaryExpression('-', estree.RawLiteral(-value, valueString));
		} else {
			tree = estree.RawLiteral(value, valueString);
		}
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
		'isRepeatable': true,
		'isPureBoolean': (value === 0 || value === 1)
	};
}
exports.ConstExpression = ConstExpression;

function DereferenceExpression(arg, context) {
	assert(arg.intendedType.category == 'pointer');

	var intendedTargetType = arg.intendedType.targetType;
	var tree;

	switch (intendedTargetType.category) {
		case 'int':
			var constructor = estree.MemberExpression(
				estree.Identifier('stdlib'), estree.Identifier('Int32Array')
			);
			context.globalContext.importByExprTree('HEAP_I32',
				estree.NewExpression(constructor, [estree.Identifier('heap')])
			);

			tree = estree.MemberExpression(
				estree.Identifier('HEAP_I32'),
				estree.BinaryExpression('>>', arg.tree, estree.Literal(2)),
				true
			);

			return {
				'tree': tree,
				'type': asmJsTypes.intish,
				'intendedType': intendedTargetType,
				'isValidAsLvalue': true
			};
		default:
			throw(
				util.format("Don't know how to dereference a pointer of type: %s",
					util.inspect(intendedTargetType)
				)
			);
	}
}
exports.DereferenceExpression = DereferenceExpression;

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

function MultiplyExpression(left, right, intendedType, context) {
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
	} else if (intendedType.category == 'int') {
		/* compile as a call to stdlib.Math.imul */
		var imul = context.globalContext.importByPath('imul', ['stdlib', 'Math', 'imul']);
		return FunctionCallExpression(
			VariableExpression(imul), [left, right]
		);
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
	} else if (intendedType.category == 'int') {
		/* NB signed vs unsigned is significant for coercion here; this case is signed */
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('/',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.intish,
			'intendedType': intendedType,
		};
	} else {
		throw(util.format(
			"Can't handle DivideExpressions of type %s", util.inspect(intendedType)
		));
	}
}
exports.DivideExpression = DivideExpression;

function ModExpression(left, right, intendedType) {
	if (intendedType.category == 'double') {
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('%',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.double,
			'intendedType': intendedType,
		};
	} else if (intendedType.category == 'int') {
		/* NB signed vs unsigned is significant for coercion here; this case is signed */
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('%',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.intish,
			'intendedType': intendedType,
		};
	} else {
		throw(util.format(
			"Can't handle ModExpressions of type %s", util.inspect(intendedType)
		));
	}
}
exports.ModExpression = ModExpression;

function NegationExpression(arg) {
	typ = null;
	if (arg.tree.type == 'Literal' && arg.tree.value > 0 && arg.tree.value <= 0x80000000) {
		typ = asmJsTypes.signed;
	} else if (arg.type.satisfies(asmJsTypes.int)) {
		typ = asmJsTypes.intish;
	} else {
		throw("Can't handle a NegationExpression with arg type: " + util.inspect(arg.type));
	}

	return {
		'tree': estree.UnaryExpression('-', wrapFunctionCall(arg).tree, true),
		'type': typ
	};
}

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

function PostincrementExpression(arg, resultIsUsed, context) {
	return PostupdateExpression(AddExpression, arg, resultIsUsed, context);
}
exports.PostincrementExpression = PostincrementExpression;

function PostdecrementExpression(arg, resultIsUsed, context) {
	return PostupdateExpression(SubtractExpression, arg, resultIsUsed, context);
}
exports.PostdecrementExpression = PostdecrementExpression;

function PostupdateExpression(internalOp, arg, resultIsUsed, context) {
	assert(arg.isIdentifier,
		"Argument of a postincrement expression must be an identifier - got " + util.inspect(arg)
	);

	if (resultIsUsed) {
		/* (arg)++ is equivalent to ((arg) = (tmp = (arg)) + 1), tmp */
		if (arg.type.satisfies(asmJsTypes.int)) {
			/* register a temp local var of type 'int' */
			var tempVariable = context.declareVariable('temp', null, arg.intendedType, 0);
			return CommaExpression(
				AssignmentExpression(
					arg,
					internalOp(
						AssignmentExpression(VariableExpression(tempVariable), arg),
						ConstExpression(1, cTypes.int),
						cTypes.int,
						context
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

function ShiftLeftExpression(left, right, intendedType) {
	if (intendedType.category == 'int') {
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('<<',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.signed,
			'intendedType': intendedType,
		};
	} else {
		throw(util.format(
			"Can't handle ShiftLeftExpression of type %s", util.inspect(intendedType)
		));
	}
}
exports.ShiftLeftExpression = ShiftLeftExpression;

function ShiftRightExpression(left, right, intendedType) {
	if (intendedType.category == 'int') {
		left = coerce(left, intendedType);
		right = coerce(right, intendedType);
		return {
			'tree': estree.BinaryExpression('>>',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.signed,
			'intendedType': intendedType,
		};
	} else {
		throw(util.format(
			"Can't handle ShiftRightExpression of type %s", util.inspect(intendedType)
		));
	}
}
exports.ShiftRightExpression = ShiftRightExpression;

function SubtractExpression(left, right, intendedType, context) {
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
			'tree': estree.BinaryExpression('-',
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
			'tree': estree.BinaryExpression('-',
				wrapFunctionCall(left).tree,
				wrapFunctionCall(right).tree
			),
			'type': asmJsTypes.double,
			'intendedType': intendedType,
			'isAdditiveExpression': true
		};
	} else {
		throw(util.format(
			"Can't handle SubtractExpressions of type %s", util.inspect(intendedType)
		));
	}
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

function compileExpression(expression, context) {
	var left, right, arg, typ;

	if (expression.isCompileTimeConstant) {
		return ConstExpression(expression.compileTimeConstantValue, expression.type);
	}

	switch(expression.expressionType) {
		case 'AddExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return AddExpression(left, right, expression.type, context);
		case 'AddAssignmentExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return AddAssignmentExpression(left, right, expression.type, context);
		case 'SubtractAssignmentExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return SubtractAssignmentExpression(left, right, expression.type, context);
		case 'AssignmentExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return AssignmentExpression(left, right);
		case 'CommaExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return CommaExpression(left, right);
		case 'ConditionalExpression':
			var test = compileExpression(expression.test, context);
			var consequent = compileExpression(expression.consequent, context);
			var alternate = compileExpression(expression.alternate, context);
			return ConditionalExpression(test, consequent, alternate, expression.type);
		case 'ConstExpression':
			return ConstExpression(expression.value, expression.type);
		case 'DivideExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return DivideExpression(left, right, expression.type);
		case 'DereferenceExpression':
			arg = compileExpression(expression.argument, context);
			return DereferenceExpression(arg, context);
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee, context);
			var args = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				args[i] = compileExpression(expression.parameters[i], context);
			}
			return FunctionCallExpression(callee, args);
		case 'LogicalAndExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return LogicalAndExpression(left, right, expression.resultIsUsed, expression.resultIsUsedAsBoolean);
		case 'LogicalNotExpression':
			arg = compileExpression(expression.argument, context);
			return LogicalNotExpression(arg);
		case 'LogicalOrExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return LogicalOrExpression(left, right, expression.resultIsUsed, expression.resultIsUsedAsBoolean);
		case 'ModExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return ModExpression(left, right, expression.type);
		case 'MultiplyExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return MultiplyExpression(left, right, expression.type, context);
		case 'LessThanExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return LessThanExpression(left, right, expression.operandType);
		case 'GreaterThanExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return GreaterThanExpression(left, right, expression.operandType);
		case 'EqualExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return EqualExpression(left, right, expression.operandType);
		case 'NotEqualExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return NotEqualExpression(left, right, expression.operandType);
		case 'LessThanOrEqualExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return LessThanOrEqualExpression(left, right, expression.operandType);
		case 'GreaterThanOrEqualExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return GreaterThanOrEqualExpression(left, right, expression.operandType);
		case 'NegationExpression':
			arg = compileExpression(expression.argument, context);
			return NegationExpression(arg);
		case 'PostdecrementExpression':
			arg = compileExpression(expression.argument, context);
			return PostdecrementExpression(arg, expression.resultIsUsed, context);
		case 'PostincrementExpression':
			arg = compileExpression(expression.argument, context);
			return PostincrementExpression(arg, expression.resultIsUsed, context);
		case 'ShiftLeftExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return ShiftLeftExpression(left, right, expression.type);
		case 'ShiftRightExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return ShiftRightExpression(left, right, expression.type);
		case 'SubtractExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			return SubtractExpression(left, right, expression.type, context);
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
					'isPureBoolean': expr.isPureBoolean,
					'isAnnotatedAsSigned': true
				};
			} else if (expr.type.satisfies(asmJsTypes.double)) {
				/* coerce double to signed using ~~x */
				return {
					'tree': estree.UnaryExpression('~', estree.UnaryExpression('~', expr.tree)),
					'type': asmJsTypes.signed,
					'intendedType': intendedType
				};
			} else {
				throw(
					util.format("Don't know how to coerce expression %s to signed int",
						util.inspect(expr)
					)
				);
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
		case 'pointer':
			/* model pointers as unsigned ints */
			if (expr.type.satisfies(asmJsTypes.unsigned)) {
				/* no coercion necessary */
			} else if (expr.type.satisfies(asmJsTypes.intish)) {
				/* coerce intish to unsigned using x >>> 0 */
				return {
					'tree': estree.BinaryExpression('>>>', expr.tree, estree.Literal(0)),
					'type': asmJsTypes.unsigned,
					'intendedType': intendedType,
					'isPureBoolean': expr.isPureBoolean
				};
			} else {
				throw(
					util.format("Don't know how to coerce expression %s to unsigned int",
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
exports.coerce = coerce;

function wrapFunctionCall(expr) {
	/* asm.js only allows function calls to be used in limited contexts, mostly ones that
	look like coercion expressions (foo() | 0 etc). In the cases where they aren't allowed,
	call this to wrap it in a suitable do-nothing coercion */
	if (!expr.isFunctionCall) return expr;

	if (expr.type.satisfies(asmJsTypes.signed)) {
		return {
			'tree': estree.BinaryExpression('|', expr.tree, estree.Literal(0)),
			'type': asmJsTypes.signed,
			'isPureBoolean': expr.isPureBoolean,
			'isAnnotatedAsSigned': true
		};
	} else if (expr.type.satisfies(asmJsTypes.double)) {
		return {
			'tree': estree.UnaryExpression('+', expr.tree),
			'type': asmJsTypes.double,
			'isAnnotatedAsDouble': true
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
