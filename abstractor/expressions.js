var assert = require('assert');
var util = require('util');

var cTypes = require('./c_types');


class Expression {
	constructor(hints) {
		this.resultIsUsed = hints.resultIsUsed;
		this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;
	}
}

class ArithmeticExpression extends Expression {
	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': this.resultIsUsed
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed
		});

		if (this.left.type == cTypes.double || this.right.type == cTypes.double) {
			this.type = cTypes.double;
			if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = +this.calcFunction(
					+this.left.compileTimeConstantValue, +this.right.compileTimeConstantValue,
					this.type
				);
			}
		} else if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
			this.type = cTypes.int;
			if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = this.calcFunction(
					this.left.compileTimeConstantValue | 0, this.right.compileTimeConstantValue | 0,
					this.type
				) | 0;
			}
		} else if (
			(this.expressionType == 'AddExpression' || this.expressionType == 'SubtractExpression') &&
			this.left.type.category == 'pointer' && this.right.type == cTypes.int
		) {
			this.type = this.left.type;
			if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = this.calcFunction(
					this.left.compileTimeConstantValue,
					this.right.compileTimeConstantValue * this.type.targetType.size,
					this.type
				) >>> 0;
			}
		} else if (
			(this.expressionType == 'AddExpression') &&
			this.left.type == cTypes.int && this.right.type.category == 'pointer'
		) {
			this.type = this.right.type;
			if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = this.calcFunction(
					this.left.compileTimeConstantValue * this.type.targetType.size,
					this.right.compileTimeConstantValue,
					this.type
				) >>> 0;
			}
		} else {
			throw(
				util.format("Don't know how to handle %s with types: %s, %s",
					this.expressionType,
					util.inspect(this.left.type),
					util.inspect(this.right.type)
				)
			);
		}
	}

	inspect() {
		return util.format(
			"%s: (%s, %s) <%s>",
			this.expressionType, util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}

class AddExpression extends ArithmeticExpression {
	get expressionType() {return 'AddExpression';}

	calcFunction(a, b, typ) {
		return a + b;
	}
}

class SubtractExpression extends ArithmeticExpression {
	get expressionType() {return 'SubtractExpression';}

	calcFunction(a, b, typ) {
		return a - b;
	}
}

class MultiplyExpression extends ArithmeticExpression {
	get expressionType() {return 'MultiplyExpression';}

	calcFunction(a, b, typ) {
		return (typ.category == 'int') ? Math.imul(a, b) : (a * b);
	}
}

class DivideExpression extends ArithmeticExpression {
	get expressionType() {return 'DivideExpression';}

	calcFunction(a, b, typ) {
		return a / b;
	}
}

class ModExpression extends ArithmeticExpression {
	get expressionType() {return 'ModExpression';}

	calcFunction(a, b, typ) {
		return a % b;
	}
}

class AssignmentExpression extends Expression {
	get expressionType() {return 'AssignmentExpression';}

	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': true
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': true
		});
		this.type = this.left.type;
	}

	inspect() {
		return util.format(
			"Assignment: (%s = %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}


class AddAssignmentExpression extends AssignmentExpression {
	get expressionType() {return 'AddAssignmentExpression';}

	inspect() {
		return util.format(
			"AddAssignment: (%s += %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}

class SubtractAssignmentExpression extends AssignmentExpression {
	get expressionType() {return 'SubtractAssignmentExpression';}

	inspect() {
		return util.format(
			"SubtractAssignment: (%s += %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}

class CommaExpression extends Expression {
	get expressionType() {return 'CommaExpression';}

	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': false
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': this.resultIsUsedAsBoolean
		});
		this.type = this.right.type;
		if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = this.right.compileTimeConstantValue;
		}
	}

	inspect() {
		return util.format(
			"Comma: (%s, %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}

class ConditionalExpression extends Expression {
	get expressionType() {return 'ConditionalExpression';}

	constructor(test, consequent, alternate, context, hints) {
		super(hints);

		this.test = constructExpression(test, context, {
			'resultIsUsed': true,
			'resultIsUsedAsBoolean': true
		});
		this.consequent = constructExpression(consequent, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': this.resultIsUsedAsBoolean
		});
		this.alternate = constructExpression(alternate, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': this.resultIsUsedAsBoolean
		});

		if (this.consequent.type == cTypes.int && this.alternate.type == cTypes.int) {
			this.type = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle ConditionalExpression with types: %s, %s",
					util.inspect(this.consequent.type),
					util.inspect(this.alternate.type)
				)
			);
		}

		if (this.test.isCompileTimeConstant && this.consequent.isCompileTimeConstant && this.alternate.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = (this.test.compileTimeConstantValue ? this.consequent.compileTimeConstantValue : this.alternate.compileTimeConstantValue);
		}
	}

	inspect() {
		return util.format(
			"ConditionalExpression: %s ? %s : %s -> <%s>",
			util.inspect(this.test), util.inspect(this.consequent), util.inspect(this.alternate),
			util.inspect(this.type)
		);
	}
}

class ConstExpression extends Expression {
	get expressionType() {return 'ConstExpression';}

	constructor(numString, context, hints) {
		super(hints);

		if (numString.match(/^\d+$/)) {
			this.value = parseInt(numString, 10);
			if (this.value >= -0x80000000 && this.value <= 0x7fffffff) {
				this.type = cTypes.int;
			} else {
				throw("Integer out of range: " + numString);
			}
		} else if (numString.match(/^\d+\.\d+$/)) {
			this.value = parseFloat(numString);
			this.type = cTypes.double;
			if (isNaN(this.value)) {
				throw("Not a number: " + numString);
			}
		} else {
			throw("Unrecognised numeric constant: " + numString);
		}

		this.isCompileTimeConstant = true;
		this.compileTimeConstantValue = this.value;
	}

	inspect() {
		return util.format(
			"Const: %s <%s>", this.value, util.inspect(this.type)
		);
	}
}
exports.ConstExpression = ConstExpression;

class DereferenceExpression extends Expression {
	get expressionType() {return 'DereferenceExpression';}

	constructor(argument, context, hints) {
		super(hints);

		this.argument = constructExpression(argument, context, {
			'resultIsUsed': this.resultIsUsed
		});

		assert(
			this.argument.type.category == 'pointer',
			util.format("Attempting to dereference a non-pointer type: %s", util.inspect(this.argument.type))
		);
		this.type = this.argument.type.targetType;
	}

	inspect() {
		return util.format(
			"Dereference: (%s) <%s>",
			util.inspect(this.argument), util.inspect(this.type)
		);
	}
}

class FunctionCallExpression extends Expression {
	get expressionType() {return 'FunctionCallExpression';}

	constructor(callee, params, context, hints) {
		super(hints);

		this.callee = constructExpression(callee, context, {
			'resultIsUsed': true
		});
		this.parameters = [];
		for (var i = 0; i < params.length; i++) {
			this.parameters.push(constructExpression(params[i], context, {
				'resultIsUsed': true
			}));
		}
		this.type = this.callee.type.returnType;
	}

	inspect() {
		return util.format(
			"FunctionCall: %s(%s) <%s>",
			util.inspect(this.callee), util.inspect(this.parameters), util.inspect(this.type)
		);
	}
}


class LogicalAndExpression extends Expression {
	get expressionType() {return 'LogicalAndExpression';}

	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});

		if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
			this.type = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle LogicalAndExpression with types: %s, %s",
					util.inspect(this.left.type),
					util.inspect(this.right.type)
				)
			);
		}

		if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = +!!(this.left.compileTimeConstantValue && this.right.compileTimeConstantValue);
		}
	}

	inspect() {
		return util.format(
			"LogicalAnd: (%s, %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}


class LogicalNotExpression extends Expression {
	get expressionType() {return 'LogicalNotExpression';}

	constructor(argument, context, hints) {
		super(hints);

		this.argument = constructExpression(argument, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});

		if (this.argument.type == cTypes.int) {
			this.type = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle LogicalNotExpression with type: %s",
					util.inspect(this.argument.type)
				)
			);
		}

		if (this.argument.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = +!this.argument.compileTimeConstantValue;
		}
	}

	inspect() {
		return util.format(
			"LogicalNot: (%s) <%s>",
			util.inspect(this.argument), util.inspect(this.type)
		);
	}
}

class LogicalOrExpression extends Expression {
	get expressionType() {return 'LogicalOrExpression';}

	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});

		if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
			this.type = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle LogicalOrExpression with types: %s, %s",
					util.inspect(this.left.type),
					util.inspect(this.right.type)
				)
			);
		}

		if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = +!!(this.left.compileTimeConstantValue || this.right.compileTimeConstantValue);
		}
	}

	inspect() {
		return util.format(
			"LogicalOr: (%s, %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}


class RelationalExpression extends Expression {
	constructor(left, right, context, hints) {
		super(hints);

		this.type = cTypes.int;

		this.left = constructExpression(left, context, {
			'resultIsUsed': this.resultIsUsed
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed
		});

		if (this.left.type == cTypes.double || this.right.type == cTypes.double) {
			this.operandType = cTypes.double;
		} else if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
			this.operandType = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle %s with types: %s, %s",
					this.expressionType,
					util.inspect(this.left.type),
					util.inspect(this.right.type)
				)
			);
		}

		if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = +this.calcFunction(this.left.compileTimeConstantValue, this.right.compileTimeConstantValue);
		}
	}

	inspect() {
		return util.format(
			"%s: (%s, %s) <%s> -> <%s>",
			this.expressionType,
			util.inspect(this.left), util.inspect(this.right),
			util.inspect(this.operandType), util.inspect(this.type)
		);
	}
}

class LessThanExpression extends RelationalExpression {
	get expressionType() {return 'LessThanExpression';}
	calcFunction(a, b) {return a < b;}
}
class GreaterThanExpression extends RelationalExpression {
	get expressionType() {return 'GreaterThanExpression';}
	calcFunction(a, b) {return a > b;}
}
class EqualExpression extends RelationalExpression {
	get expressionType() {return 'EqualExpression';}
	calcFunction(a, b) {return a == b;}
}
class NotEqualExpression extends RelationalExpression {
	get expressionType() {return 'NotEqualExpression';}
	calcFunction(a, b) {return a != b;}
}
class LessThanOrEqualExpression extends RelationalExpression {
	get expressionType() {return 'LessThanOrEqualExpression';}
	calcFunction(a, b) {return a <= b;}
}
class GreaterThanOrEqualExpression extends RelationalExpression {
	get expressionType() {return 'GreaterThanOrEqualExpression';}
	calcFunction(a, b) {return a >= b;}
}


class NegationExpression extends Expression {
	get expressionType() {return 'NegationExpression';}

	constructor(argument, context, hints) {
		super(hints);

		this.argument = constructExpression(argument, context, {
			'resultIsUsed': this.resultIsUsed
		});

		if (this.argument.type == cTypes.int) {
			this.type = cTypes.int;
			if (this.argument.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = -this.argument.compileTimeConstantValue;
			}
		} else {
			throw(
				util.format("Don't know how to handle NegationExpression with type: %s",
					util.inspect(this.argument.type)
				)
			);
		}
	}

	inspect() {
		return util.format(
			"Negation: (%s) <%s>",
			util.inspect(this.argument), util.inspect(this.type)
		);
	}
}

class PostdecrementExpression extends Expression {
	get expressionType() {return 'PostdecrementExpression';}

	constructor(argument, context, hints) {
		super(hints);

		this.argument = constructExpression(argument, context, {
			'resultIsUsed': true
		});

		if (this.argument.type == cTypes.int) {
			this.type = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle PostdecrementExpression with type: %s",
					util.inspect(this.argument.type)
				)
			);
		}
	}

	inspect() {
		return util.format(
			"Postdecrement: (%s) <%s>",
			util.inspect(this.argument), util.inspect(this.type)
		);
	}
}

class PostincrementExpression extends Expression {
	get expressionType() {return 'PostincrementExpression';}

	constructor(argument, context, hints) {
		super(hints);

		this.argument = constructExpression(argument, context, {
			'resultIsUsed': true
		});

		if (this.argument.type == cTypes.int) {
			this.type = cTypes.int;
		} else {
			throw(
				util.format("Don't know how to handle PostincrementExpression with type: %s",
					util.inspect(this.argument.type)
				)
			);
		}
	}

	inspect() {
		return util.format(
			"Postdecrement: (%s) <%s>",
			util.inspect(this.argument), util.inspect(this.type)
		);
	}
}

class ShiftLeftExpression extends Expression {
	get expressionType() {return 'ShiftLeftExpression';}

	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': this.resultIsUsed
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed
		});

		if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
			this.type = cTypes.int;
			if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = (this.left.compileTimeConstantValue << this.right.compileTimeConstantValue) | 0;
			}
		} else {
			throw(
				util.format("Don't know how to handle ShiftLeftExpression with types: %s, %s",
					util.inspect(this.left.type),
					util.inspect(this.right.type)
				)
			);
		}
	}

	inspect() {
		return util.format(
			"ShiftLeft: (%s, %s) <%s>",
			this.expressionType, util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}

class ShiftRightExpression extends Expression {
	get expressionType() {return 'ShiftRightExpression';}

	constructor(left, right, context, hints) {
		super(hints);

		this.left = constructExpression(left, context, {
			'resultIsUsed': this.resultIsUsed
		});
		this.right = constructExpression(right, context, {
			'resultIsUsed': this.resultIsUsed
		});

		if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
			this.type = cTypes.int;
			if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
				this.isCompileTimeConstant = true;
				this.compileTimeConstantValue = (this.left.compileTimeConstantValue >> this.right.compileTimeConstantValue) | 0;
			}
		} else {
			throw(
				util.format("Don't know how to handle ShiftRightExpression with types: %s, %s",
					util.inspect(this.left.type),
					util.inspect(this.right.type)
				)
			);
		}
	}

	inspect() {
		return util.format(
			"ShiftRight: (%s, %s) <%s>",
			this.expressionType, util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}
}

class VariableExpression extends Expression {
	get expressionType() {return 'VariableExpression';}

	constructor(variableName, context, hints) {
		super(hints);

		this.variable = context.get(variableName);
		if (this.variable === null) {
			throw "Variable not found: " + variableName;
		}
		this.type = this.variable.type;
	}

	inspect() {
		return util.format(
			"Var: %s#%d <%s>",
			this.variable.name, this.variable.id, util.inspect(this.type)
		);
	}
}

ASSIGNMENT_OPERATORS = {
	'=': AssignmentExpression,
	'+=': AddAssignmentExpression,
	'-=': SubtractAssignmentExpression
};

BINARY_OPERATORS = {
	'+': AddExpression,
	'-': SubtractExpression,
	'<': LessThanExpression,
	'>': GreaterThanExpression,
	'==': EqualExpression,
	'!=': NotEqualExpression,
	'<=': LessThanOrEqualExpression,
	'>=': GreaterThanOrEqualExpression,
	'&&': LogicalAndExpression,
	'||': LogicalOrExpression,
	'*': MultiplyExpression,
	'/': DivideExpression,
	'%': ModExpression,
	'<<': ShiftLeftExpression,
	'>>': ShiftRightExpression
};

POSTUPDATE_OPERATORS = {
	'--': PostdecrementExpression,
	'++': PostincrementExpression
};

UNARY_OPERATORS = {
	'-': NegationExpression,
	'!': LogicalNotExpression,
	'*': DereferenceExpression
};

function constructExpression(node, context, hints) {
	var operator, constructor;

	switch (node.type) {
		case 'Assign':
			operator = node.params[1];
			constructor = ASSIGNMENT_OPERATORS[operator];
			assert(constructor, "Unrecognised assignment operator: " + operator);
			return new constructor(node.params[0], node.params[2], context, hints);
		case 'BinaryOp':
			operator = node.params[0];
			constructor = BINARY_OPERATORS[operator];
			assert(constructor, "Unrecognised binary operator: " + operator);
			return new constructor(node.params[1], node.params[2], context, hints);
		case 'Conditional':
			return new ConditionalExpression(node.params[0], node.params[1], node.params[2], context, hints);
		case 'Const':
			return new ConstExpression(node.params[0], context, hints);
		case 'FunctionCall':
			return new FunctionCallExpression(node.params[0], node.params[1], context, hints);
		case 'Postupdate':
			operator = node.params[0];
			constructor = POSTUPDATE_OPERATORS[operator];
			assert(constructor, "Unrecognised postupdate operator: " + operator);
			return new constructor(node.params[1], context, hints);
		case 'Sequence':
			return new CommaExpression(node.params[0], node.params[1], context, hints);
		case 'UnaryOp':
			operator = node.params[0];
			constructor = UNARY_OPERATORS[operator];
			assert(constructor, "Unrecognised unary operator: " + operator);
			return new constructor(node.params[1], context, hints);
		case 'Var':
			return new VariableExpression(node.params[0], context, hints);
		default:
			throw("Unrecognised expression node type: " + node.type);
	}
}

exports.constructExpression = constructExpression;
