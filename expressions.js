var assert = require('assert');
var types = require('./types');
var estree = require('./estree');
var util = require('util');

function coerce(expr, targetType) {
	/* Return an estree expression structure for the Expression 'expr' coerced
	to the specified target type */
	if (types.satisfies(expr.type, targetType)) {
		// expression is already of the correct type; no coercion required
		return expr.compile();
	} else if (types.satisfies(expr.type, types.intish) && types.satisfies(types.signed, targetType)) {
		// coerce intish to signed using expr|0
		return estree.BinaryExpression('|',
			expr.compile(),
			estree.Literal(0)
		);
	} else {
		throw util.format("Cannot coerce type %s to %s", util.inspect(expr.type), util.inspect(targetType));
	}
}
exports.coerce = coerce;

function buildExpression(node, context, resultIsUsed) {
	var left, right, op;
	var self = {};

	switch (node.type) {
		case 'BinaryOp':
			op = node.params[0];
			left = buildExpression(node.params[1], context, resultIsUsed);
			right = buildExpression(node.params[2], context, resultIsUsed);

			switch (op) {
				case '+':
				case '-':
					assert(types.satisfies(left.type, types.int));
					assert(types.satisfies(right.type, types.int));
					assert(
						types.equal(left.intendedType, right.intendedType),
						util.format("Intended types in additive operation differ: %s vs %s", util.inspect(left.intendedType), util.inspect(right.intendedType))
					);
					self.type = types.intish;
					self.intendedType = left.intendedType;

					/* an expression is considered to be 'repeatable' if multiple occurrences
					of it can appear in the output without causing unwanted additional calculation
					(including, but not limited to, calculation with side effects).
					For example, transforming "++i" to "i = i + 1" would be acceptable,
					as would "++i[x]" => "i[x] = i[x] + 1",
					but "++i[x+y]" => "i[x+y] = i[x+y] + 1" would not;
					x+y should be evaluated into a temporary variable instead.
					*/
					self.isRepeatable = false;

					self.compile = function() {
						return estree.BinaryExpression(op, left.compile(), right.compile());
					};
					return self;
				case '<':
				case '>':
				case '<=':
					if (types.satisfies(left.intendedType, types.signed) && types.satisfies(right.intendedType, types.signed)) {
						self.type = self.intendedType = types.int; // TODO: figure out why this isn't fixnum - surely the only expected values are 0 and 1?
						self.isRepeatable = false;
						self.compile = function() {
							return estree.BinaryExpression(op, coerce(left, left.intendedType), coerce(right, right.intendedType));
						};
					} else {
						throw util.format("Unsupported types in relation operator: %s vs %s", util.inspect(left.type), util.inspect(right.type));
					}
					return self;
				case '*':
					assert(types.equal(left.type, right.type));
					assert(types.equal(left.intendedType, right.intendedType));
					self.type = left.type;
					self.intendedType = left.intendedType;
					self.isRepeatable = false;
					self.compile = function() {
						return estree.BinaryExpression(op, left.compile(), right.compile());
					};
					return self;
				default:
					throw "Unsupported binary operator: " + op;
			}
		case 'Assign':
			left = buildExpression(node.params[0], context, true);
			assert(left.isAssignable);

			op = node.params[1];
			assert(op == '=' || op == '+=');

			right = buildExpression(node.params[2], context, true);

			self.type = left.type;
			self.intendedType = left.intendedType;
			self.isRepeatable = false;

			self.compile = function() {
				return estree.AssignmentExpression(op, left.compile(), coerce(right, self.type));
			};
			return self;
		case 'Const':
			var numString = node.params[0];
			self.isConstant = true;
			self.isRepeatable = true;
			if (numString.match(/^\d+$/) && parseInt(numString, 10) < Math.pow(2, 31)) {
				self.type = types.fixnum;
				self.intendedType = types.signed;
				self.compile = function() {
					return estree.Literal(parseInt(numString, 10));
				};
			} else {
				throw("Unsupported numeric constant: " + numString);
			}
			return self;
		case 'FunctionCall':
			var callee = buildExpression(node.params[0], context, true);
			assert.equal('function', callee.type.category);
			self.type = callee.type.returnType;
			self.intendedType = callee.intendedType.returnType;
			self.isRepeatable = false;
			var paramTypes = callee.type.paramTypes;

			var argNodes = node.params[1];
			assert(Array.isArray(argNodes));
			var args = [];
			for (var i = 0; i < argNodes.length; i++) {
				args[i] = buildExpression(argNodes[i], context, true);
				assert(
					types.satisfies(args[i].type, paramTypes[i]),
					util.format("Incompatible argument type in function call: expected %s, got %s", util.inspect(paramTypes[i]), util.inspect(args[i].type))
				);
			}

			self.compile = function() {
				var compiledArgs = [];
				for (var i = 0; i < args.length; i++) {
					compiledArgs[i] = args[i].compile();
				}
				return estree.CallExpression(callee.compile(), compiledArgs);
			};
			return self;
		case 'Postupdate':
			op = node.params[0];
			assert(op == '++');
			if (resultIsUsed) {
				throw "Postupdate operations where the result is used (rather than discarded) are not currently supported)";
			}
			left = buildExpression(node.params[1], context, true);
			assert(left.isAssignable);
			assert(left.isRepeatable);
			assert(types.equal(types.int, left.type), "Postupdate is only currently supported on ints");

			/* if the result is not used AND the operand is repeatable AND the operand is an int (signed?),
				(operand)++ can be compiled to (operand) = (operand) + 1 | 0 */

			self.type = left.type;
			self.intendedType = left.intendedType;
			self.isRepeatable = false;
			self.compile = function() {
				return estree.UpdateExpression(op, left.compile(), false);
			};
			return self;
		case 'Var':
			var identifier = node.params[0];
			var variable = context.getVariable(identifier);
			if (variable === null) {
				throw "Undefined variable: " + identifier;
			}
			self.type = variable.type;
			self.intendedType = variable.intendedType;
			self.isRepeatable = true;

			self.isAssignable = true;
			self.compile = function() {
				return estree.Identifier(variable.jsIdentifier);
			};
			return self;
		default:
			throw("Unimplemented expression type: " + node.type);
	}
}

exports.buildExpression = buildExpression;
