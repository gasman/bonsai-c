var assert = require('assert');
var types = require('./types');
var estree = require('./estree');

function Expression(node, context) {
	var left, right, op;
	switch (node.type) {
		case 'BinaryOp':
			op = node.params[0];
			assert(op == '+' || op == '-');
			left = new Expression(node.params[1], context);
			right = new Expression(node.params[2], context);
			assert(types.equal(left.type, right.type));
			this.type = left.type;
			this.compile = function() {
				return estree.BinaryExpression(op, left.compile(), right.compile());
			};
			break;
		case 'Assign':
			left = new Expression(node.params[0], context);
			assert(left.isAssignable);

			var operator = node.params[1];
			assert.equal('=', operator,
				"Assignment operators other than '=' are not yet implemented"
			);

			right = new Expression(node.params[2], context);
			assert(types.equal(left.type, right.type));

			this.type = left.type;

			this.compile = function() {
				return estree.AssignmentExpression('=', left.compile(), right.compile());
			};
			break;
		case 'Const':
			var numString = node.params[0];
			this.isConstant = true;
			if (numString.match(/^\d+$/)) {
				this.type = types.int;
				this.compile = function() {
					return estree.Literal(parseInt(numString, 10));
				};
			} else {
				throw("Unsupported numeric constant: " + numString);
			}
			break;
		case 'FunctionCall':
			var callee = new Expression(node.params[0], context);
			assert.equal('function', callee.type.category);
			this.type = callee.type.returnType;
			var paramTypes = callee.type.paramTypes;

			var argNodes = node.params[1];
			assert(Array.isArray(argNodes));
			var args = [];
			for (var i = 0; i < argNodes.length; i++) {
				args[i] = new Expression(argNodes[i], context);
				assert(types.equal(paramTypes[i], args[i].type));
			}

			this.compile = function() {
				var compiledArgs = [];
				for (var i = 0; i < args.length; i++) {
					compiledArgs[i] = args[i].compile();
				}
				return estree.CallExpression(callee.compile(), compiledArgs);
			};
			break;
		case 'Var':
			var identifier = node.params[0];
			this.type = context.getVariableType(identifier);
			if (this.type === null) {
				throw "Undefined variable: " + identifier;
			}

			this.isAssignable = true;
			this.compile = function() {
				return estree.Identifier(identifier);
			};
			break;
		default:
			throw("Unimplemented expression type: " + node.type);
	}
}

exports.Expression = Expression;
