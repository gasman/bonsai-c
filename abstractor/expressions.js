var assert = require('assert');
var util = require('util');

var cTypes = require('./c_types');


function ArithmeticExpression(expressionType, calcFunction, left, right, context, hints) {
	this.expressionType = expressionType;
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
			this.compileTimeConstantValue = +calcFunction(
				+this.left.compileTimeConstantValue, +this.right.compileTimeConstantValue,
				this.type
			);
		}
	} else if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
		this.type = cTypes.int;
		if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
			this.isCompileTimeConstant = true;
			this.compileTimeConstantValue = calcFunction(
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
			this.compileTimeConstantValue = calcFunction(
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
			this.compileTimeConstantValue = calcFunction(
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
AddExpression.prototype.inspect = function() {
	return util.format(
		"%s: (%s, %s) <%s>",
		this.expressionType, util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function AddExpression(left, right, context, hints) {
	return new ArithmeticExpression('AddExpression', function(a, b) {return a + b;}, left, right, context, hints);
}
function SubtractExpression(left, right, context, hints) {
	return new ArithmeticExpression('SubtractExpression', function(a, b) {return a - b;}, left, right, context, hints);
}
function MultiplyExpression(left, right, context, hints) {
	return new ArithmeticExpression(
		'MultiplyExpression',
		function(a, b, typ) {return (typ.category == 'int') ? Math.imul(a, b) : (a * b);},
		left, right, context, hints
	);
}
function DivideExpression(left, right, context, hints) {
	return new ArithmeticExpression('DivideExpression', function(a, b) {return a / b;}, left, right, context, hints);
}
function ModExpression(left, right, context, hints) {
	return new ArithmeticExpression('ModExpression', function(a, b) {return a % b;}, left, right, context, hints);
}

function AddAssignmentExpression(left, right, context, hints) {
	this.expressionType = 'AddAssignmentExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

	this.left = constructExpression(left, context, {
		'resultIsUsed': true
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': true
	});
	this.type = this.left.type;
}
AddAssignmentExpression.prototype.inspect = function() {
	return util.format(
		"AddAssignment: (%s += %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};
function SubtractAssignmentExpression(left, right, context, hints) {
	this.expressionType = 'SubtractAssignmentExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

	this.left = constructExpression(left, context, {
		'resultIsUsed': true
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': true
	});
	this.type = this.left.type;
}
SubtractAssignmentExpression.prototype.inspect = function() {
	return util.format(
		"SubtractAssignment: (%s += %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function AssignmentExpression(left, right, context, hints) {
	this.expressionType = 'AssignmentExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

	this.left = constructExpression(left, context, {
		'resultIsUsed': true
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': true
	});
	this.type = this.left.type;
}
AssignmentExpression.prototype.inspect = function() {
	return util.format(
		"Assignment: (%s = %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function CommaExpression(left, right, context, hints) {
	this.expressionType = 'CommaExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
CommaExpression.prototype.inspect = function() {
	return util.format(
		"Comma: (%s, %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function ConditionalExpression(test, consequent, alternate, context, hints) {
	this.expressionType = 'ConditionalExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
		this.compileTimeConstantValue = (this.test.compileTimeConstantValue ? this.consequent.compileTimeConstantValue : this.alternate.compileTimeConstantValue)
	}
}
ConditionalExpression.prototype.inspect = function() {
	return util.format(
		"ConditionalExpression: %s ? %s : %s -> <%s>",
		util.inspect(this.test), util.inspect(this.consequent), util.inspect(this.alternate),
		util.inspect(this.type)
	);
};

function ConstExpression(numString, context, hints) {
	this.expressionType = 'ConstExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
ConstExpression.prototype.inspect = function() {
	return util.format(
		"Const: %s <%s>", this.value, util.inspect(this.type)
	);
};
exports.ConstExpression = ConstExpression;

function DereferenceExpression(argument, context, hints) {
	this.expressionType = 'DereferenceExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

	this.argument = constructExpression(argument, context, {
		'resultIsUsed': this.resultIsUsed
	});

	assert(
		this.argument.type.category == 'pointer',
		util.format("Attempting to dereference a non-pointer type: %s", util.inspect(this.argument.type))
	);
	this.type = this.argument.type.targetType;
}
DereferenceExpression.prototype.inspect = function() {
	return util.format(
		"Dereference: (%s) <%s>",
		util.inspect(this.argument), util.inspect(this.type)
	);
};

function FunctionCallExpression(callee, params, context, hints) {
	this.expressionType = 'FunctionCallExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
FunctionCallExpression.prototype.inspect = function() {
	return util.format(
		"FunctionCall: %s(%s) <%s>",
		util.inspect(this.callee), util.inspect(this.parameters), util.inspect(this.type)
	);
};


function LogicalAndExpression(left, right, context, hints) {
	this.expressionType = 'LogicalAndExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
LogicalAndExpression.prototype.inspect = function() {
	return util.format(
		"LogicalAnd: (%s, %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};


function LogicalNotExpression(argument, context, hints) {
	this.expressionType = 'LogicalNotExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
LogicalNotExpression.prototype.inspect = function() {
	return util.format(
		"LogicalNot: (%s) <%s>",
		util.inspect(this.argument), util.inspect(this.type)
	);
};

function LogicalOrExpression(left, right, context, hints) {
	this.expressionType = 'LogicalOrExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
LogicalOrExpression.prototype.inspect = function() {
	return util.format(
		"LogicalOr: (%s, %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};



function RelationalExpression(expressionType, calcFunction, left, right, context, hints) {
	this.expressionType = expressionType;
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
				expressionType,
				util.inspect(this.left.type),
				util.inspect(this.right.type)
			)
		);
	}

	if (this.left.isCompileTimeConstant && this.right.isCompileTimeConstant) {
		this.isCompileTimeConstant = true;
		this.compileTimeConstantValue = +calcFunction(this.left.compileTimeConstantValue, this.right.compileTimeConstantValue);
	}
}
RelationalExpression.prototype.inspect = function() {
	return util.format(
		"%s: (%s, %s) <%s> -> <%s>",
		this.expressionType,
		util.inspect(this.left), util.inspect(this.right),
		util.inspect(this.operandType), util.inspect(this.type)
	);
};

function LessThanExpression(left, right, context, hints) {
	return new RelationalExpression('LessThanExpression', function(a, b) {return a < b;}, left, right, context, hints);
}
function GreaterThanExpression(left, right, context, hints) {
	return new RelationalExpression('GreaterThanExpression', function(a, b) {return a > b;}, left, right, context, hints);
}
function EqualExpression(left, right, context, hints) {
	return new RelationalExpression('EqualExpression', function(a, b) {return a == b;}, left, right, context, hints);
}
function NotEqualExpression(left, right, context, hints) {
	return new RelationalExpression('NotEqualExpression', function(a, b) {return a != b;}, left, right, context, hints);
}
function LessThanOrEqualExpression(left, right, context, hints) {
	return new RelationalExpression('LessThanOrEqualExpression', function(a, b) {return a <= b;}, left, right, context, hints);
}
function GreaterThanOrEqualExpression(left, right, context, hints) {
	return new RelationalExpression('GreaterThanOrEqualExpression', function(a, b) {return a >= b;}, left, right, context, hints);
}


function NegationExpression(argument, context, hints) {
	this.expressionType = 'NegationExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
NegationExpression.prototype.inspect = function() {
	return util.format(
		"Negation: (%s) <%s>",
		util.inspect(this.argument), util.inspect(this.type)
	);
};

function PostdecrementExpression(argument, context, hints) {
	this.expressionType = 'PostdecrementExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;
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
PostdecrementExpression.prototype.inspect = function() {
	return util.format(
		"Postdecrement: (%s) <%s>",
		util.inspect(this.argument), util.inspect(this.type)
	);
};
function PostincrementExpression(argument, context, hints) {
	this.expressionType = 'PostincrementExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;
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
PostdecrementExpression.prototype.inspect = function() {
	return util.format(
		"Postdecrement: (%s) <%s>",
		util.inspect(this.argument), util.inspect(this.type)
	);
};

function ShiftLeftExpression(left, right, context, hints) {
	this.expressionType = 'ShiftLeftExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
ShiftLeftExpression.prototype.inspect = function() {
	return util.format(
		"ShiftLeft: (%s, %s) <%s>",
		this.expressionType, util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function ShiftRightExpression(left, right, context, hints) {
	this.expressionType = 'ShiftRightExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

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
ShiftRightExpression.prototype.inspect = function() {
	return util.format(
		"ShiftRight: (%s, %s) <%s>",
		this.expressionType, util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function VariableExpression(variableName, context, hints) {
	this.expressionType = 'VariableExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.resultIsUsedAsBoolean = hints.resultIsUsedAsBoolean;

	this.variable = context.get(variableName);
	if (this.variable === null) {
		throw "Variable not found: " + variableName;
	}
	this.type = this.variable.type;
}
VariableExpression.prototype.inspect = function() {
	return util.format(
		"Var: %s#%d <%s>",
		this.variable.name, this.variable.id, util.inspect(this.type)
	);
};

function constructExpression(node, context, hints) {
	var operator;

	switch (node.type) {
		case 'Assign':
			operator = node.params[1];
			switch (operator) {
				case '=':
					return new AssignmentExpression(node.params[0], node.params[2], context, hints);
				case '+=':
					return new AddAssignmentExpression(node.params[0], node.params[2], context, hints);
				case '-=':
					return new SubtractAssignmentExpression(node.params[0], node.params[2], context, hints);
				default:
					throw("Unrecognised assignment operator: " + operator);
			}
			break;
		case 'BinaryOp':
			operator = node.params[0];
			switch (operator) {
				case '+':
					return new AddExpression(node.params[1], node.params[2], context, hints);
				case '-':
					return new SubtractExpression(node.params[1], node.params[2], context, hints);
				case '<':
					return new LessThanExpression(node.params[1], node.params[2], context, hints);
				case '>':
					return new GreaterThanExpression(node.params[1], node.params[2], context, hints);
				case '==':
					return new EqualExpression(node.params[1], node.params[2], context, hints);
				case '!=':
					return new NotEqualExpression(node.params[1], node.params[2], context, hints);
				case '<=':
					return new LessThanOrEqualExpression(node.params[1], node.params[2], context, hints);
				case '>=':
					return new GreaterThanOrEqualExpression(node.params[1], node.params[2], context, hints);
				case '&&':
					return new LogicalAndExpression(node.params[1], node.params[2], context, hints);
				case '||':
					return new LogicalOrExpression(node.params[1], node.params[2], context, hints);
				case '*':
					return new MultiplyExpression(node.params[1], node.params[2], context, hints);
				case '/':
					return new DivideExpression(node.params[1], node.params[2], context, hints);
				case '%':
					return new ModExpression(node.params[1], node.params[2], context, hints);
				case '<<':
					return new ShiftLeftExpression(node.params[1], node.params[2], context, hints);
				case '>>':
					return new ShiftRightExpression(node.params[1], node.params[2], context, hints);
				default:
					throw("Unrecognised binary operator: " + operator);
			}
			break;
		case 'Conditional':
			return new ConditionalExpression(node.params[0], node.params[1], node.params[2], context, hints);
		case 'Const':
			return new ConstExpression(node.params[0], context, hints);
		case 'FunctionCall':
			return new FunctionCallExpression(node.params[0], node.params[1], context, hints);
		case 'Postupdate':
			operator = node.params[0];
			switch (operator) {
				case '--':
					return new PostdecrementExpression(node.params[1], context, hints);
				case '++':
					return new PostincrementExpression(node.params[1], context, hints);
				default:
					throw("Unrecognised postupdate operator: " + operator);
			}
			break;
		case 'Sequence':
			return new CommaExpression(node.params[0], node.params[1], context, hints);
		case 'UnaryOp':
			operator = node.params[0];
			switch (operator) {
				case '-':
					return new NegationExpression(node.params[1], context, hints);
				case '!':
					return new LogicalNotExpression(node.params[1], context, hints);
				case '*':
					return new DereferenceExpression(node.params[1], context, hints);
				default:
					throw("Unrecognised unary operator: " + operator);
			}
			break;
		case 'Var':
			return new VariableExpression(node.params[0], context, hints);
		default:
			throw("Unrecognised expression node type: " + node.type);
	}
}

exports.constructExpression = constructExpression;
