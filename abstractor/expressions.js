var util = require('util');

var cTypes = require('./c_types');


function AddExpression(left, right, context, hints) {
	this.expressionType = 'AddExpression';
	this.resultIsUsed = hints.resultIsUsed;

	this.left = constructExpression(left, context, {
		'resultIsUsed': this.resultIsUsed
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': this.resultIsUsed
	});

	if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
		this.type = cTypes.int;
	} else {
		throw(
			util.format("Don't know how to handle AddExpression with types: %s, %s",
				util.inspect(this.left.type),
				util.inspect(this.right.type)
			)
		);
	}
}
AddExpression.prototype.inspect = function() {
	return util.format(
		"Add: (%s, %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function AddAssignmentExpression(left, right, context, hints) {
	this.expressionType = 'AddAssignmentExpression';
	this.resultIsUsed = hints.resultIsUsed;

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

	this.left = constructExpression(left, context, {
		'resultIsUsed': false
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': this.resultIsUsed
	});
	this.type = this.right.type;
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

	this.test = constructExpression(test, context, {
		'resultIsUsed': true
	});
	this.consequent = constructExpression(consequent, context, {
		'resultIsUsed': this.resultIsUsed
	});
	this.alternate = constructExpression(alternate, context, {
		'resultIsUsed': this.resultIsUsed
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
}
ConstExpression.prototype.inspect = function() {
	return util.format(
		"Const: %s <%s>", this.value, util.inspect(this.type)
	);
};

function FunctionCallExpression(callee, params, context, hints) {
	this.expressionType = 'FunctionCallExpression';
	this.resultIsUsed = hints.resultIsUsed;

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

	this.left = constructExpression(left, context, {
		'resultIsUsed': this.resultIsUsed
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': this.resultIsUsed
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

	this.argument = constructExpression(argument, context, {
		'resultIsUsed': this.resultIsUsed
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
}
NegationExpression.prototype.inspect = function() {
	return util.format(
		"LogicalNot: (%s) <%s>",
		util.inspect(this.argument), util.inspect(this.type)
	);
};


function RelationalExpression(expressionType, left, right, context, hints) {
	this.expressionType = expressionType;
	this.resultIsUsed = hints.resultIsUsed;

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
	return new RelationalExpression('LessThanExpression', left, right, context, hints);
}
function GreaterThanExpression(left, right, context, hints) {
	return new RelationalExpression('GreaterThanExpression', left, right, context, hints);
}
function EqualExpression(left, right, context, hints) {
	return new RelationalExpression('EqualExpression', left, right, context, hints);
}
function NotEqualExpression(left, right, context, hints) {
	return new RelationalExpression('NotEqualExpression', left, right, context, hints);
}
function LessThanOrEqualExpression(left, right, context, hints) {
	return new RelationalExpression('LessThanOrEqualExpression', left, right, context, hints);
}
function GreaterThanOrEqualExpression(left, right, context, hints) {
	return new RelationalExpression('GreaterThanOrEqualExpression', left, right, context, hints);
}


function NegationExpression(argument, context, hints) {
	this.expressionType = 'NegationExpression';
	this.resultIsUsed = hints.resultIsUsed;

	this.argument = constructExpression(argument, context, {
		'resultIsUsed': this.resultIsUsed
	});

	if (this.argument.type == cTypes.int) {
		this.type = cTypes.int;
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

function SubtractExpression(left, right, context, hints) {
	this.expressionType = 'SubtractExpression';
	this.resultIsUsed = hints.resultIsUsed;

	this.left = constructExpression(left, context, {
		'resultIsUsed': this.resultIsUsed
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': this.resultIsUsed
	});
	if (this.left.type == cTypes.int && this.right.type == cTypes.int) {
		this.type = cTypes.int;
	} else {
		throw(
			util.format("Don't know how to handle SubtractExpression with types: %s, %s",
				util.inspect(this.left.type),
				util.inspect(this.right.type)
			)
		);
	}
}
SubtractExpression.prototype.inspect = function() {
	return util.format(
		"Subtract: (%s, %s) <%s>",
		util.inspect(this.left), util.inspect(this.right), util.inspect(this.type)
	);
};

function VariableExpression(variableName, context, hints) {
	this.expressionType = 'VariableExpression';
	this.resultIsUsed = hints.resultIsUsed;

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
