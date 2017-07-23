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
	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;

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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new AddExpression(left, right, hints);
	}
}

class SubtractExpression extends ArithmeticExpression {
	get expressionType() {return 'SubtractExpression';}

	calcFunction(a, b, typ) {
		return a - b;
	}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new SubtractExpression(left, right, hints);
	}
}

class MultiplyExpression extends ArithmeticExpression {
	get expressionType() {return 'MultiplyExpression';}

	calcFunction(a, b, typ) {
		return (typ.category == 'int') ? Math.imul(a, b) : (a * b);
	}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new MultiplyExpression(left, right, hints);
	}
}

class DivideExpression extends ArithmeticExpression {
	get expressionType() {return 'DivideExpression';}

	calcFunction(a, b, typ) {
		return a / b;
	}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new DivideExpression(left, right, hints);
	}
}

class ModExpression extends ArithmeticExpression {
	get expressionType() {return 'ModExpression';}

	calcFunction(a, b, typ) {
		return a % b;
	}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new ModExpression(left, right, hints);
	}
}

class AssignmentExpression extends Expression {
	get expressionType() {return 'AssignmentExpression';}

	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;
		this.type = this.left.type;
	}

	inspect() {
		return util.format(
			"Assignment: (%s = %s) <%s>",
			util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
		);
	}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[0], context, {
			'resultIsUsed': true
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': true
		});
		return new AssignmentExpression(left, right, hints);
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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[0], context, {
			'resultIsUsed': true
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': true
		});
		return new AddAssignmentExpression(left, right, hints);
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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[0], context, {
			'resultIsUsed': true
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': true
		});
		return new SubtractAssignmentExpression(left, right, hints);
	}
}

class CommaExpression extends Expression {
	get expressionType() {return 'CommaExpression';}

	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;
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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[0], context, {
			'resultIsUsed': false
		});
		var right = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': hints.resultIsUsedAsBoolean
		});
		return new CommaExpression(left, right, hints);
	}
}

class ConditionalExpression extends Expression {
	get expressionType() {return 'ConditionalExpression';}

	constructor(test, consequent, alternate, hints) {
		super(hints);

		this.test = test;
		this.consequent = consequent;
		this.alternate = alternate;

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

	static fromNode(node, context, hints) {
		var test = constructExpression(node.params[0], context, {
			'resultIsUsed': true,
			'resultIsUsedAsBoolean': true
		});
		var consequent = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': hints.resultIsUsedAsBoolean
		});
		var alternate = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': hints.resultIsUsedAsBoolean
		});

		return new ConditionalExpression(test, consequent, alternate, hints);
	}
}

class ConstExpression extends Expression {
	get expressionType() {return 'ConstExpression';}

	constructor(value, typ, hints) {
		super(hints);

		this.value = value;
		this.type = typ;
		this.isCompileTimeConstant = true;
		this.compileTimeConstantValue = this.value;
	}

	inspect() {
		return util.format(
			"Const: %s <%s>", this.value, util.inspect(this.type)
		);
	}

	static fromNode(node, context, hints) {
		var numString = node.params[0];
		var value, typ;

		if (numString.match(/^\d+$/)) {
			value = parseInt(numString, 10);
			if (value >= -0x80000000 && value <= 0x7fffffff) {
				typ = cTypes.int;
			} else {
				throw("Integer out of range: " + numString);
			}
		} else if (numString.match(/^\d+\.\d+$/)) {
			value = parseFloat(numString);
			typ = cTypes.double;
			if (isNaN(value)) {
				throw("Not a number: " + numString);
			}
		} else {
			throw("Unrecognised numeric constant: " + numString);
		}

		return new ConstExpression(value, typ, hints);
	}
}
exports.ConstExpression = ConstExpression;

class DereferenceExpression extends Expression {
	get expressionType() {return 'DereferenceExpression';}

	constructor(argument, hints) {
		super(hints);
		this.argument = argument;

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

	static fromNode(node, context, hints) {
		var argument = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new DereferenceExpression(argument, hints);
	}
}

class FunctionCallExpression extends Expression {
	get expressionType() {return 'FunctionCallExpression';}

	constructor(callee, params, hints) {
		super(hints);

		this.callee = callee;
		this.parameters = params;
		this.type = this.callee.type.returnType;
	}

	inspect() {
		return util.format(
			"FunctionCall: %s(%s) <%s>",
			util.inspect(this.callee), util.inspect(this.parameters), util.inspect(this.type)
		);
	}

	static fromNode(node, context, hints) {
		var callee = constructExpression(node.params[0], context, {
			'resultIsUsed': true
		});
		var paramNodes = node.params[1];
		var params = [];
		for (var i = 0; i < paramNodes.length; i++) {
			params.push(constructExpression(paramNodes[i], context, {
				'resultIsUsed': true
			}));
		}

		return new FunctionCallExpression(callee, params, hints);
	}
}


class LogicalAndExpression extends Expression {
	get expressionType() {return 'LogicalAndExpression';}

	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;

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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});

		return new LogicalAndExpression(left, right, hints);
	}
}


class LogicalNotExpression extends Expression {
	get expressionType() {return 'LogicalNotExpression';}

	constructor(argument, hints) {
		super(hints);
		this.argument = argument;

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

	static fromNode(node, context, hints) {
		var argument = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});
		return new LogicalNotExpression(argument, hints);
	}
}

class LogicalOrExpression extends Expression {
	get expressionType() {return 'LogicalOrExpression';}

	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;

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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed,
			'resultIsUsedAsBoolean': true
		});

		return new LogicalOrExpression(left, right, hints);
	}
}


class RelationalExpression extends Expression {
	constructor(left, right, hints) {
		super(hints);

		this.type = cTypes.int;
		this.left = left;
		this.right = right;

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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new LessThanExpression(left, right, hints);
	}
}
class GreaterThanExpression extends RelationalExpression {
	get expressionType() {return 'GreaterThanExpression';}
	calcFunction(a, b) {return a > b;}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new GreaterThanExpression(left, right, hints);
	}
}
class EqualExpression extends RelationalExpression {
	get expressionType() {return 'EqualExpression';}
	calcFunction(a, b) {return a == b;}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new EqualExpression(left, right, hints);
	}
}
class NotEqualExpression extends RelationalExpression {
	get expressionType() {return 'NotEqualExpression';}
	calcFunction(a, b) {return a != b;}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new NotEqualExpression(left, right, hints);
	}
}
class LessThanOrEqualExpression extends RelationalExpression {
	get expressionType() {return 'LessThanOrEqualExpression';}
	calcFunction(a, b) {return a <= b;}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new LessThanOrEqualExpression(left, right, hints);
	}
}
class GreaterThanOrEqualExpression extends RelationalExpression {
	get expressionType() {return 'GreaterThanOrEqualExpression';}
	calcFunction(a, b) {return a >= b;}

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new GreaterThanOrEqualExpression(left, right, hints);
	}
}


class NegationExpression extends Expression {
	get expressionType() {return 'NegationExpression';}

	constructor(argument, hints) {
		super(hints);
		this.argument = argument;

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

	static fromNode(node, context, hints) {
		var argument = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new NegationExpression(argument, hints);
	}
}

class PostdecrementExpression extends Expression {
	get expressionType() {return 'PostdecrementExpression';}

	constructor(argument, hints) {
		super(hints);
		this.argument = argument;

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

	static fromNode(node, context, hints) {
		var argument = constructExpression(node.params[1], context, {
			'resultIsUsed': true
		});

		return new PostdecrementExpression(argument, hints);
	}
}

class PostincrementExpression extends Expression {
	get expressionType() {return 'PostincrementExpression';}

	constructor(argument, hints) {
		super(hints);
		this.argument = argument;

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

	static fromNode(node, context, hints) {
		var argument = constructExpression(node.params[1], context, {
			'resultIsUsed': true
		});

		return new PostincrementExpression(argument, hints);
	}
}

class ShiftLeftExpression extends Expression {
	get expressionType() {return 'ShiftLeftExpression';}

	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;

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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new ShiftLeftExpression(left, right, hints);
	}
}

class ShiftRightExpression extends Expression {
	get expressionType() {return 'ShiftRightExpression';}

	constructor(left, right, hints) {
		super(hints);

		this.left = left;
		this.right = right;

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

	static fromNode(node, context, hints) {
		var left = constructExpression(node.params[1], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		var right = constructExpression(node.params[2], context, {
			'resultIsUsed': hints.resultIsUsed
		});
		return new ShiftRightExpression(left, right, hints);
	}
}

class VariableExpression extends Expression {
	get expressionType() {return 'VariableExpression';}

	constructor(variable, hints) {
		super(hints);

		this.variable = variable;
		this.type = this.variable.type;
	}

	inspect() {
		return util.format(
			"Var: %s#%d <%s>",
			this.variable.name, this.variable.id, util.inspect(this.type)
		);
	}

	static fromNode(node, context, hints) {
		var variableName = node.params[0];
		var variable = context.get(variableName);
		assert(variable, "Variable not found: " + variableName);
		return new VariableExpression(variable, hints);
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
			return constructor.fromNode(node, context, hints);
		case 'BinaryOp':
			operator = node.params[0];
			constructor = BINARY_OPERATORS[operator];
			assert(constructor, "Unrecognised binary operator: " + operator);
			return constructor.fromNode(node, context, hints);
		case 'Conditional':
			return ConditionalExpression.fromNode(node, context, hints);
		case 'Const':
			return ConstExpression.fromNode(node, context, hints);
		case 'FunctionCall':
			return FunctionCallExpression.fromNode(node, context, hints);
		case 'Postupdate':
			operator = node.params[0];
			constructor = POSTUPDATE_OPERATORS[operator];
			assert(constructor, "Unrecognised postupdate operator: " + operator);
			return constructor.fromNode(node, context, hints);
		case 'Sequence':
			return CommaExpression.fromNode(node, context, hints);
		case 'UnaryOp':
			operator = node.params[0];
			constructor = UNARY_OPERATORS[operator];
			assert(constructor, "Unrecognised unary operator: " + operator);
			return constructor.fromNode(node, context, hints);
		case 'Var':
			return VariableExpression.fromNode(node, context, hints);
		default:
			throw("Unrecognised expression node type: " + node.type);
	}
}

exports.constructExpression = constructExpression;
