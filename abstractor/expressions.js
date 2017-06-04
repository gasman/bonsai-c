var util = require('util');

function AddExpression(left, right, context) {
	this.expressionType = 'AddExpression';

	this.left = constructExpression(left, context);
	this.right = constructExpression(right, context);
}
AddExpression.prototype.inspect = function() {
	return "Add: (" + util.inspect(this.left) + ", " + util.inspect(this.right) + ")";
};

function AssignmentExpression(left, right, context) {
	this.expressionType = 'AssignmentExpression';

	this.left = constructExpression(left, context);
	this.right = constructExpression(right, context);
}
AssignmentExpression.prototype.inspect = function() {
	return "Assignment: (" + util.inspect(this.left) + " = " + util.inspect(this.right) + ")";
};

function ConstExpression(node, context) {
	this.expressionType = 'ConstExpression';

	var numString = node.params[0];
	if (numString.match(/^\d+$/)) {
		this.value = parseInt(numString, 10);
	} else {
		throw("Unrecognised numeric constant: " + numString);
	}
}
ConstExpression.prototype.inspect = function() {
	return "Const: " + this.value;
};

function VariableExpression(node, context) {
	this.expressionType = 'VariableExpression';

	var variableName = node.params[0];
	this.variable = context.get(variableName);
	if (this.variable === null) {
		throw "Variable not found: " + variableName;
	}
}
VariableExpression.prototype.inspect = function() {
	return "Var: " + util.inspect(this.variable);
};

function constructExpression(node, context) {
	var operator;

	switch (node.type) {
		case 'Assign':
			operator = node.params[1];
			switch (operator) {
				case '=':
					return new AssignmentExpression(node.params[0], node.params[2], context);
				default:
					throw("Unrecognised assignment operator: " + operator);
			}
			break;
		case 'BinaryOp':
			operator = node.params[0];
			switch (operator) {
				case '+':
					return new AddExpression(node.params[1], node.params[2], context);
				default:
					throw("Unrecognised binary operator: " + operator);
			}
			break;
		case 'Const':
			return new ConstExpression(node, context);
		case 'Var':
			return new VariableExpression(node, context);
		default:
			throw("Unrecognised expression node type: " + node.type);
	}
}

exports.constructExpression = constructExpression;
