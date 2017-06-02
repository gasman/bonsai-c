var util = require('util');

function AddExpression(left, right) {
	this.expressionType = 'AddExpression';

	this.left = constructExpression(left);
	this.right = constructExpression(right);
}
AddExpression.prototype.inspect = function() {
	return "Add: (" + util.inspect(this.left) + ", " + util.inspect(this.right) + ")";
};

function ConstExpression(node) {
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

function constructExpression(node) {
	switch (node.type) {
		case 'BinaryOp':
			var operator = node.params[0];
			switch (operator) {
				case '+':
					return new AddExpression(node.params[1], node.params[2]);
				default:
					throw("Unrecognised binary operator: " + operator);
			}
		case 'Const':
			return new ConstExpression(node);
		default:
			throw("Unrecognised expression node type: " + node.type);
	}
}

exports.constructExpression = constructExpression;
