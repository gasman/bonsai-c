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
		case 'Const':
			return new ConstExpression(node);
		default:
			throw("Unrecognised expression node type: " + node.type);
	}
}

exports.constructExpression = constructExpression;
