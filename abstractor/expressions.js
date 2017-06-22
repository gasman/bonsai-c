var util = require('util');

function AddExpression(left, right, context, hints) {
	this.expressionType = 'AddExpression';
	this.resultIsUsed = hints.resultIsUsed;

	this.left = constructExpression(left, context, {
		'resultIsUsed': this.resultIsUsed
	});
	this.right = constructExpression(right, context, {
		'resultIsUsed': this.resultIsUsed
	});
}
AddExpression.prototype.inspect = function() {
	return "Add: (" + util.inspect(this.left) + ", " + util.inspect(this.right) + ")";
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
}
AssignmentExpression.prototype.inspect = function() {
	return "Assignment: (" + util.inspect(this.left) + " = " + util.inspect(this.right) + ")";
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
}
CommaExpression.prototype.inspect = function() {
	return "Comma: (" + util.inspect(this.left) + ", " + util.inspect(this.right) + ")";
};

function ConstExpression(numString, context, hints) {
	this.expressionType = 'ConstExpression';
	this.resultIsUsed = hints.resultIsUsed;

	if (numString.match(/^\d+$/)) {
		this.value = parseInt(numString, 10);
	} else {
		throw("Unrecognised numeric constant: " + numString);
	}
}
ConstExpression.prototype.inspect = function() {
	return "Const: " + this.value;
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
}
FunctionCallExpression.prototype.inspect = function() {
	return "FunctionCall: " + util.inspect(this.callee) + "(" + util.inspect(this.parameters) + ")";
};

function NegationExpression(argument, context, hints) {
	this.expressionType = 'NegationExpression';
	this.resultIsUsed = hints.resultIsUsed;

	this.argument = constructExpression(argument, context, {
		'resultIsUsed': this.resultIsUsed
	});
}
NegationExpression.prototype.inspect = function() {
	return "Negation: (" + util.inspect(this.argument) + ")";
};

function PostdecrementExpression(argument, context, hints) {
	this.expressionType = 'PostdecrementExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.argument = constructExpression(argument, context, {
		'resultIsUsed': true
	});
}
PostdecrementExpression.prototype.inspect = function() {
	return "Postdecrement: (" + util.inspect(this.argument) + ")";
};
function PostincrementExpression(argument, context, hints) {
	this.expressionType = 'PostincrementExpression';
	this.resultIsUsed = hints.resultIsUsed;
	this.argument = constructExpression(argument, context, {
		'resultIsUsed': true
	});
}
PostdecrementExpression.prototype.inspect = function() {
	return "Postincrement: (" + util.inspect(this.argument) + ")";
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
}
SubtractExpression.prototype.inspect = function() {
	return "Subtract: (" + util.inspect(this.left) + ", " + util.inspect(this.right) + ")";
};

function VariableExpression(variableName, context, hints) {
	this.expressionType = 'VariableExpression';
	this.resultIsUsed = hints.resultIsUsed;

	this.variable = context.get(variableName);
	if (this.variable === null) {
		throw "Variable not found: " + variableName;
	}
}
VariableExpression.prototype.inspect = function() {
	return "Var: " + util.inspect(this.variable);
};

function constructExpression(node, context, hints) {
	var operator;

	switch (node.type) {
		case 'Assign':
			operator = node.params[1];
			switch (operator) {
				case '=':
					return new AssignmentExpression(node.params[0], node.params[2], context, hints);
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
				default:
					throw("Unrecognised binary operator: " + operator);
			}
			break;
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
