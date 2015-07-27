var assert = require('assert');
var types = require('./types');
var estree = require('./estree');
var util = require('util');

function Expression(node, context) {
	var left, right, op;
	switch (node.type) {
		case 'BinaryOp':
			op = node.params[0];
			assert(op == '+' || op == '-' || op == '<' || op == '>' || op == '<=' || op == '*');
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

			op = node.params[1];
			assert(op == '=' || op == '+=');

			right = new Expression(node.params[2], context);
			assert(
				types.satisfies(right.type, left.type),
				util.format("Incompatible types for assignment: %s vs %s", util.inspect(left.type), util.inspect(right.type))
			);

			this.type = left.type;

			this.compile = function() {
				return estree.AssignmentExpression(op, left.compile(), right.compile());
			};
			break;
		case 'Const':
			var numString = node.params[0];
			this.isConstant = true;
			if (numString.match(/^\d+$/) && parseInt(numString, 10) < Math.pow(2, 31)) {
				this.type = types.fixnum;
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
				assert(
					types.satisfies(args[i].type, paramTypes[i]),
					util.format("Incompatible argument type in function call: expected %s, got %s", util.inspect(paramTypes[i]), util.inspect(args[i].type))
				);
			}

			this.compile = function() {
				var compiledArgs = [];
				for (var i = 0; i < args.length; i++) {
					compiledArgs[i] = args[i].compile();
				}
				return estree.CallExpression(callee.compile(), compiledArgs);
			};
			break;
		case 'Postupdate':
			op = node.params[0];
			assert(op == '++');
			left = new Expression(node.params[1], context);
			assert(types.equal(types.int, left.type), "Postupdate is only currently supported on ints");
			this.type = left.type;
			this.compile = function() {
				return estree.UpdateExpression(op, left.compile(), false);
			};
			break;
		case 'Var':
			var identifier = node.params[0];
			var variable = context.getVariable(identifier);
			if (variable === null) {
				throw "Undefined variable: " + identifier;
			}
			this.type = variable.type;

			this.isAssignable = true;
			this.compile = function() {
				return estree.Identifier(variable.jsIdentifier);
			};
			break;
		default:
			throw("Unimplemented expression type: " + node.type);
	}
}

exports.Expression = Expression;
