var assert = require('assert');
var types = require('./types');
var estree = require('./estree');
var util = require('util');

function annotateAsDouble(exprTree) {
	return estree.UnaryExpression('+', exprTree, true);
}
exports.annotateAsDouble = annotateAsDouble;

function annotateAsSigned(exprTree) {
	return estree.BinaryExpression('|',
		exprTree,
		estree.RawLiteral(0, '0')
	);
}
exports.annotateAsSigned = annotateAsSigned;

function coerce(expr, targetType) {
	/* Return an estree expression structure for the Expression 'expr' coerced
	to the specified target type */
	if (types.satisfies(expr.type, targetType)) {
		// expression is already of the correct type; no coercion required
		return expr.compile();
	} else if (types.satisfies(expr.type, types.intish) && types.satisfies(types.signed, targetType)) {
		// coerce intish to signed using expr|0
		return annotateAsSigned(expr.compile());
	} else {
		throw util.format("Cannot coerce type %s to %s", util.inspect(expr.type), util.inspect(targetType));
	}
}
exports.coerce = coerce;

function typeAfterCoercion(expr, targetType) {
	/* Return the type that 'expr' will become after coercing to targetType using the 'coerce' function */
	if (types.satisfies(expr.type, targetType)) {
		return expr.type;
	} else if (types.satisfies(expr.type, types.intish) && types.satisfies(types.signed, targetType)) {
		return types.signed;
	} else {
		throw util.format("Cannot coerce type %s to %s", util.inspect(expr.type), util.inspect(targetType));
	}
}

function AdditiveExpression(op, left, right) {
	var self = {};

	assert(
		types.equal(left.intendedType, right.intendedType),
		util.format("Intended types in additive operation differ: %s vs %s", util.inspect(left.intendedType), util.inspect(right.intendedType))
	);
	if (types.satisfies(left.intendedType, types.int) && types.satisfies(right.intendedType, types.int)) {
		self.type = types.intish;
		self.expectedLeftType = types.int;
		self.expectedRightType = types.int;
		self.intendedType = left.intendedType;
	} else if (left.isAdditiveExpression && types.satisfies(left.intendedType, types.intish) && types.satisfies(right.intendedType, types.int)) {
		/* int-typed additive expressions can be chained, even though the result of an intermediate
		additive expression is intish rather than int */
		self.type = types.intish;
		self.expectedLeftType = types.int;
		self.expectedRightType = types.int;
		self.intendedType = left.intendedType;
	} else if (op == '-' && types.satisfies(left.intendedType, types.doubleq) && types.satisfies(right.intendedType, types.doubleq)) {
		self.type = types.double;
		self.expectedLeftType = types.doubleq;
		self.expectedRightType = types.doubleq;
		self.intendedType = left.intendedType;
	} else if (op == '+' && types.satisfies(left.intendedType, types.double) && types.satisfies(right.intendedType, types.double)) {
		self.type = types.double;
		self.expectedLeftType = types.double;
		self.expectedRightType = types.double;
		self.intendedType = left.intendedType;
	} else {
		throw util.format("Unsupported types for additive operation: %s and %s", util.inspect(left.type), util.inspect(right.type));
	}

	/* an expression is considered to be 'repeatable' if multiple occurrences
	of it can appear in the output without causing unwanted additional calculation
	(including, but not limited to, calculation with side effects).
	For example, transforming "++i" to "i = i + 1" would be acceptable,
	as would "++i[x]" => "i[x] = i[x] + 1",
	but "++i[x+y]" => "i[x+y] = i[x+y] + 1" would not;
	x+y should be evaluated into a temporary variable instead.
	*/
	self.isRepeatable = false;

	/* used in the type-checking rules immediately above, to indicate that (for operations on
	int) this is legal to be chained with other integer additive expressions, despite its
	result type being intish rather than int
	*/
	self.isAdditiveExpression = true;

	self.compile = function() {
		return estree.BinaryExpression(op, coerce(left, self.expectedLeftType), coerce(right, self.expectedRightType));
	};
	self.findDeclaredVariables = function(vars) {
		left.findDeclaredVariables(vars);
		right.findDeclaredVariables(vars);
	};

	return self;
}

function RelationalExpression(op, left, right) {
	var self = {};

	var hasValidTypes;

	if (types.satisfies(left.intendedType, types.signed) && types.satisfies(right.intendedType, types.signed)) {
		hasValidTypes = true;
		self.expectedLeftType = types.signed;
		self.expectedRightType = types.signed;
	} else if (types.satisfies(left.intendedType, types.double) && types.satisfies(right.intendedType, types.double)) {
		hasValidTypes = true;
		self.expectedLeftType = types.double;
		self.expectedRightType = types.double;
	} else {
		hasValidTypes = false;
	}

	if (hasValidTypes) {
		self.type = self.intendedType = types.int; // TODO: figure out why this isn't fixnum - surely the only expected values are 0 and 1?
		self.isRepeatable = false;
		self.isPureBoolean = true;  /* results are always 0 or 1 (so don't need casting to boolean when faking && / || with conditional expressions) */
		self.compile = function() {
			return estree.BinaryExpression(op, coerce(left, self.expectedLeftType), coerce(right, self.expectedRightType));
		};
		self.findDeclaredVariables = function(vars) {
			left.findDeclaredVariables(vars);
			right.findDeclaredVariables(vars);
		};
	} else {
		throw util.format("Unsupported types in relational expression: %s vs %s", util.inspect(left.type), util.inspect(right.type));
	}

	return self;
}

function MultiplicativeExpression(op, left, right) {
	var self = {};

	if (op == '*' && types.satisfies(left.intendedType, types.intish) && types.satisfies(right.intendedType, types.intish)) {
		/* rewrite as a call to Math.imul */
		throw "Integer multiplication not supported yet";
		/*
		return FunctionCallExpression(
			'stdlib.Math.imul', // TODO: declare this as a variable
			[left, right]
		);
		*/
	} else if (op == '/' && types.satisfies(left.intendedType, types.signed) && types.satisfies(right.intendedType, types.signed)) {
		self.type = types.intish;
		self.expectedLeftType = types.signed;
		self.expectedRightType = types.signed;
		self.intendedType = left.intendedType;
	} else if (types.satisfies(left.intendedType, types.doubleq) && types.satisfies(right.intendedType, types.doubleq)) {
		self.type = types.double;
		self.expectedLeftType = types.doubleq;
		self.expectedRightType = types.doubleq;
		self.intendedType = left.intendedType;
	} else {
		throw util.format("Unsupported types in multiplicative expression with operator '%s': %s vs %s", op, util.inspect(left.intendedType), util.inspect(right.intendedType));
	}

	self.isRepeatable = false;
	self.compile = function() {
		return estree.BinaryExpression(op, coerce(left, self.expectedLeftType), coerce(right, self.expectedRightType));
	};
	self.findDeclaredVariables = function(vars) {
		left.findDeclaredVariables(vars);
		right.findDeclaredVariables(vars);
	};

	return self;
}

function AssignmentExpression(left, right) {
	var self = {};

	assert(left.isAssignable);

	self.type = typeAfterCoercion(right, left.type);
	self.intendedType = left.intendedType;
	self.isRepeatable = false;
	self.isPureBoolean = right.isPureBoolean;

	self.compile = function() {
		return estree.AssignmentExpression('=', left.compile(), coerce(right, left.type));
	};
	self.findDeclaredVariables = function(vars) {
		left.findDeclaredVariables(vars);
		right.findDeclaredVariables(vars);
	};

	return self;
}

function ConditionalExpression(test, cons, alt) {
	var self = {};

	assert(
		types.satisfies(test.intendedType, types.int),
		util.format("Invalid expression type for conditional type - expected int, got %s", util.inspect(test.intendedType))
	);

	if (types.satisfies(cons.intendedType, types.int) && types.satisfies(alt.intendedType, types.int)) {
		self.type = self.intendedType = types.int;
	} else if (types.satisfies(cons.intendedType, types.double) && types.satisfies(alt.intendedType, types.double)) {
		self.type = self.intendedType = types.double;
	}
	self.isRepeatable = false;
	self.isPureBoolean = (cons.isPureBoolean && alt.isPureBoolean);

	self.compile = function() {
		return estree.ConditionalExpression(
			coerce(test, types.int),
			coerce(cons, self.type),
			coerce(alt, self.type)
		);
	};
	self.findDeclaredVariables = function(vars) {
		test.findDeclaredVariables(vars);
		cons.findDeclaredVariables(vars);
		alt.findDeclaredVariables(vars);
	};

	return self;
}

function SequenceExpression(left, right) {
	var self = {};

	self.type = right.type;
	self.intendedType = right.intendedType;
	self.isRepeatable = false;
	self.isPureBoolean = right.isPureBoolean;

	self.compile = function() {
		var leftNode = left.compile();
		var rightNode = right.compile();
		if (leftNode.type == 'SequenceExpression') {
			/* nested sequence expressions should be flattened into a single list */
			leftNode.expressions.push(rightNode);
			return leftNode;
		} else {
			return estree.SequenceExpression([leftNode, rightNode]);
		}
	};
	self.findDeclaredVariables = function(vars) {
		left.findDeclaredVariables(vars);
		right.findDeclaredVariables(vars);
	};

	return self;
}

function LogicalNotExpression(argument) {
	var self = {};

	self.type = self.intendedType = types.int;
	self.isRepeatable = false;
	self.isPureBoolean = true;

	self.compile = function() {
		return estree.UnaryExpression('!', coerce(argument, types.int), true);
	};
	self.findDeclaredVariables = function(vars) {
		argument.findDeclaredVariables(vars);
	};

	return self;
}

function NumericLiteralExpression(value, intendedType) {
	var self = {};

	self.isConstant = true;
	self.isRepeatable = true;
	self.isPureBoolean = (value === 0 || value === 1);
	self.intendedType = intendedType;
	if (types.equal(self.intendedType, types.signed)) {
		self.type = types.fixnum;
	} else if (types.equal(self.intendedType, types.double)) {
		self.type = types.double;
	} else {
		throw util.format("Don't know how to determine actual type for intended type %s", util.inspect(self.intendedType));
	}
	self.compile = function() {
		var valueString = '' + value;
		var hasDecimalPoint = (valueString.indexOf('.') > -1);

		if (types.equal(self.type, types.fixnum) && hasDecimalPoint) {
			throw util.format("Expected an integer literal, got %s" % valueString);
		} else if (types.equal(self.type, types.double) && !hasDecimalPoint) {
			valueString += '.0';
		}
		return estree.RawLiteral(value, valueString);
	};
	self.findDeclaredVariables = function(vars) {
	};

	return self;
}

function FunctionCallExpression(callee, args, isSubexpression) {
	var self = {};

	assert.equal('function', callee.type.category);
	self.type = callee.type.returnType;
	self.intendedType = callee.intendedType.returnType;
	self.isRepeatable = false;

	/* isTypeAnnotated = true indicates that this expression provides its own type
	annotation, so the parent (e.g. a return statement) doesn't need to attach one */
	self.isTypeAnnotated = isSubexpression;

	var paramTypes = callee.type.paramTypes;

	for (var i = 0; i < args.length; i++) {
		assert(
			types.satisfies(args[i].type, paramTypes[i]),
			util.format("Incompatible argument type in function call: expected %s, got %s", util.inspect(paramTypes[i]), util.inspect(args[i].type))
		);
	}

	self.compile = function() {
		var compiledArgs = [];
		for (var i = 0; i < args.length; i++) {
			compiledArgs[i] = args[i].compile();
		}
		var callExpression = estree.CallExpression(callee.compile(), compiledArgs);
		if (isSubexpression) {
			/* function calls where the result is not discarded must be annotated */
			if (types.satisfies(self.intendedType, types.signed)) {
				return annotateAsSigned(callExpression);
			} else if (types.satisfies(self.intendedType, types.double)) {
				return annotateAsDouble(callExpression);
			} else {
				throw util.format("Don't know how to annotate function call as type %s", util.inspect(self.intendedType));
			}
		} else {
			return callExpression;
		}
	};
	self.findDeclaredVariables = function(vars) {
		callee.findDeclaredVariables(vars);
		for (var i = 0; i < args.length; i++) {
			args[i].findDeclaredVariables(vars);
		}
	};
	return self;
}

function VariableExpression(variable, addDeclaration) {
	/* if addDeclaration is true, this expression must generate a declaration for this variable */
	var self = {};

	self.type = variable.type;
	self.intendedType = variable.intendedType;
	self.isRepeatable = true;

	self.isAssignable = true;
	self.compile = function() {
		return estree.Identifier(variable.jsIdentifier);
	};
	self.findDeclaredVariables = function(vars) {
		if (addDeclaration) vars.push(variable);
	};
	return self;
}

function buildExpression(node, context, hints) {
	var left, right, op, value;
	var self = {};

	switch (node.type) {
		case 'BinaryOp':
			op = node.params[0];

			switch (op) {
				case '+':
				case '-':
					left = buildExpression(node.params[1], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: false,
						isSubexpression: true
					});
					right = buildExpression(node.params[2], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: false,
						isSubexpression: true
					});
					return AdditiveExpression(op, left, right);
				case '<':
				case '>':
				case '<=':
				case '>=':
				case '==':
				case '!=':
					left = buildExpression(node.params[1], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: false,
						isSubexpression: true
					});
					right = buildExpression(node.params[2], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: false,
						isSubexpression: true
					});
					return RelationalExpression(op, left, right);
				case '*':
				case '/':
					left = buildExpression(node.params[1], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: false,
						isSubexpression: true
					});
					right = buildExpression(node.params[2], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: false,
						isSubexpression: true
					});
					return MultiplicativeExpression(op, left, right);
				case '&&':
					left = buildExpression(node.params[1], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: true,
						isSubexpression: true
					});
					right = buildExpression(node.params[2], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: true,
						isSubexpression: true
					});
					/* asm.js does not provide logical AND; fake it with a conditional instead.
					a && b  is equivalent to:  a ? !!b : 0
					The !! can be omitted if we can be sure that b is a pure boolean (0 or 1)
					or the result is used in a pure boolean context
					*/
					if (hints.resultIsUsed && !hints.resultIsOnlyUsedInBooleanContext && !right.isPureBoolean) {
						/* we are required to return the specific value 0 or 1, and the right operand
						is not guaranteed to provide that - thus we must cast it to a boolean, using !! */
						right = LogicalNotExpression(LogicalNotExpression(right));
					}
					return ConditionalExpression(
						left,
						right,
						NumericLiteralExpression(0, types.signed)
					);
				case '||':
					left = buildExpression(node.params[1], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: true,
						isSubexpression: true
					});
					right = buildExpression(node.params[2], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: true,
						isSubexpression: true
					});
					/* asm.js does not provide logical OR; fake it with a conditional instead.
					a || b  is equivalent to:  a ? 1 : !!b
					The !! can be omitted if we can be sure that b is a pure boolean (0 or 1)
					or the result is used in a pure boolean context
					*/
					if (hints.resultIsUsed && !hints.resultIsOnlyUsedInBooleanContext && !right.isPureBoolean) {
						/* we are required to return the specific value 0 or 1, and the right operand
						is not guaranteed to provide that - thus we must cast it to a boolean, using !! */
						right = LogicalNotExpression(LogicalNotExpression(right));
					}
					return ConditionalExpression(
						left,
						NumericLiteralExpression(1, types.signed),
						right
					);
				default:
					throw "Unsupported binary operator: " + op;
			}
			break;
		case 'Assign':
			left = buildExpression(node.params[0], context, {
				resultIsUsed: true,
				resultIsOnlyUsedInBooleanContext: false,
				isSubexpression: true
			});
			op = node.params[1];
			right = buildExpression(node.params[2], context, {
				resultIsUsed: true,
				resultIsOnlyUsedInBooleanContext: false,
				isSubexpression: true
			});

			if (op == '=') {
				return AssignmentExpression(left, right);
			} else if (op == '+=') {
				assert(left.isRepeatable);

				/* if left is repeatable, left += right is equivalent to
					left = left + right */
				return AssignmentExpression(
					left,
					AdditiveExpression('+', left, right)
				);
			} else if (op == '-=') {
				assert(left.isRepeatable);

				/* if left is repeatable, left -= right is equivalent to
					left = left - right */
				return AssignmentExpression(
					left,
					AdditiveExpression('-', left, right)
				);
			} else {
				throw "Unsupported assignment operator: " + op;
			}
			break;
		case 'Conditional':
			var test = buildExpression(node.params[0], context, {
				resultIsUsed: true,
				resultIsOnlyUsedInBooleanContext: true,
				isSubexpression: true
			});
			var cons = buildExpression(node.params[1], context, {
				resultIsUsed: hints.resultIsUsed,
				resultIsOnlyUsedInBooleanContext: hints.resultIsOnlyUsedInBooleanContext,
				isSubexpression: true
			});
			var alt = buildExpression(node.params[2], context, {
				resultIsUsed: hints.resultIsUsed,
				resultIsOnlyUsedInBooleanContext: hints.resultIsOnlyUsedInBooleanContext,
				isSubexpression: true
			});

			return ConditionalExpression(test, cons, alt);
		case 'Const':
			var numString = node.params[0];
			if (numString.match(/^\d+$/)) {
				value = parseInt(numString, 10);
				if (value < Math.pow(2, 31)) {
					return NumericLiteralExpression(value, types.signed);
				} else {
					throw("Unsupported numeric constant: " + numString);
				}
			} else if (numString.match(/^(\d+\.\d*|\.\d+)$/)) {
				value = parseFloat(numString);
				return NumericLiteralExpression(value, types.double);
			} else {
				throw("Unsupported numeric constant: " + numString);
			}
			break;
		case 'FunctionCall':
			var callee = buildExpression(node.params[0], context, {
				resultIsUsed: true,
				resultIsOnlyUsedInBooleanContext: false,
				isSubexpression: true
			});
			var argNodes = node.params[1];
			assert(Array.isArray(argNodes));
			var args = [];
			for (var i = 0; i < argNodes.length; i++) {
				args[i] = buildExpression(argNodes[i], context, {
					resultIsUsed: true,
					resultIsOnlyUsedInBooleanContext: false,
					isSubexpression: true
				});
			}
			return FunctionCallExpression(callee, args, hints.isSubexpression);
		case 'Postupdate':
			op = node.params[0];

			left = buildExpression(node.params[1], context, {
				resultIsUsed: true,
				resultIsOnlyUsedInBooleanContext: false,
				isSubexpression: true
			});
			assert(left.isAssignable);
			assert(left.isRepeatable);
			assert(types.equal(types.int, left.type), "Postupdate is only currently supported on ints");

			/* if the result is not used AND the operand is repeatable,
				(operand)++ is equivalent to (operand) = (operand) + 1
				(operand)-- is equivalent to (operand) = (operand) - 1

				If the result is used AND the operand is repeatable,
				(operand)++ is equivalent to ((operand) = (tmp = (operand)) + 1), tmp
				(operand)++ is equivalent to ((operand) = (tmp = (operand)) - 1), tmp
			*/

			var additiveExpressionOp;
			if (op == '++') {
				additiveExpressionOp = '+';
			} else if (op == '--') {
				additiveExpressionOp = '-';
			} else {
				throw("Unsupported postupdate operator: " + op);
			}

			if (hints.resultIsUsed) {
				var tempVar = context.allocateVariable('temp', left.type, left.intendedType);
				return SequenceExpression(
					AssignmentExpression(
						left,
						AdditiveExpression(additiveExpressionOp,
							AssignmentExpression(VariableExpression(tempVar, true), left),
							NumericLiteralExpression(1, types.signed)
						)
					),
					VariableExpression(tempVar, false)
				);
			} else {
				return AssignmentExpression(
					left,
					AdditiveExpression(additiveExpressionOp, left, NumericLiteralExpression(1, types.signed))
				);
			}
			break;
		case 'Preupdate':
			op = node.params[0];

			left = buildExpression(node.params[1], context, {
				resultIsUsed: true,
				resultIsOnlyUsedInBooleanContext: false,
				isSubexpression: true
			});

			assert(left.isAssignable);
			assert(left.isRepeatable);
			assert(types.equal(types.int, left.type), "Postupdate is only currently supported on ints");

			/* ++(operand) is equivalent to (operand) = (operand) + 1 */
			if (op == '++') {
				return AssignmentExpression(
					left,
					AdditiveExpression('+', left, NumericLiteralExpression(1, types.signed))
				);
			} else if (op == '--') {
				return AssignmentExpression(
					left,
					AdditiveExpression('-', left, NumericLiteralExpression(1, types.signed))
				);
			} else {
				throw("Unsupported postupdate operator: " + op);
			}
			break;
		case 'Sequence':
			left = buildExpression(node.params[0], context, {
				resultIsUsed: false,
				resultIsOnlyUsedInBooleanContext: false,
				isSubexpression: false
			});
			right = buildExpression(node.params[1], context, {
				resultIsUsed: hints.resultIsUsed,
				resultIsOnlyUsedInBooleanContext: hints.resultIsOnlyUsedInBooleanContext,
				isSubexpression: false
			});
			return SequenceExpression(left, right);
		case 'UnaryOp':
			op = node.params[0];
			switch (op) {
				case '!':
					var argument = buildExpression(node.params[1], context, {
						resultIsUsed: hints.resultIsUsed,
						resultIsOnlyUsedInBooleanContext: hints.resultIsUsed,
						isSubexpression: true
					});
					return LogicalNotExpression(argument);
				default:
					throw "Unsupported unary operator: " + op;
			}
			break;

		case 'Var':
			var identifier = node.params[0];
			var variable = context.getVariable(identifier);
			if (variable === null) {
				throw "Undefined variable: " + identifier;
			}
			return VariableExpression(variable, false);
		default:
			throw("Unimplemented expression type: " + node.type);
	}
}

exports.buildExpression = buildExpression;
