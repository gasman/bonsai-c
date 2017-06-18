var assert = require('assert');
var estree = require('./estree');
var types = require('./types');

function compileExpression(expression, context) {
	var left, right, arg, typ;

	switch(expression.expressionType) {
		case 'AddExpression':
			left = compileExpression(expression.left, context);
			right = compileExpression(expression.right, context);
			if (left.type.satisfies(types.int) && right.type.satisfies(types.int)) {
				typ = types.intish;
			} else {
				throw(
					util.format("Can't handle AddExpression with operand types %s and %s",
						util.inspect(left.type),
						util.inspect(right.type)
					)
				);
			}
			return {
				'tree': estree.BinaryExpression('+', left.tree, right.tree),
				'type': typ
			};
		case 'AssignmentExpression':
			left = compileExpression(expression.left, context);
			if (left.tree.type != 'Identifier') {
				throw("Left hand side of an assignment must be an identifier - got " + left.tree.type);
			}

			right = coerce(
				compileExpression(expression.right, context),
				left.intendedType
			);

			return {
				'tree': estree.AssignmentExpression('=', left.tree, right.tree),
				'type': right.type
			};
		case 'ConstExpression':
			typ = null;
			/* FIXME: Should infer type from the numeric form in the original source code;
			e.g. 10.0 should be treated as a float/double, not an integer */
			if (Number.isInteger(expression.value)) {
				if (expression.value >= 0 && expression.value < 0x80000000) {
					typ = types.fixnum;
				} else if (expression.value >= 0x80000000 && expression.value < 0x100000000) {
					typ = types.unsigned;
				}
			}
			if (typ === null) {
				throw("Can't determine type of numeric literal: " + expression.value);
			}
			return {
				'tree': estree.Literal(expression.value),
				'type': typ
			};
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee, context);

			if (callee.tree.type != 'Identifier') {
				throw("Callee of a function call must be an identifier - got " + callee.tree.type);
			}

			var expectedParamTypes = callee.type.paramTypes;

			var argTrees = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				arg = coerce(
					compileExpression(expression.parameters[i], context),
					expectedParamTypes[i]
				);
				argTrees.push(arg.tree);
			}
			return {
				'tree': estree.CallExpression(callee.tree, argTrees),
				'type': callee.type.returnType
			};
		case 'NegationExpression':
			arg = compileExpression(expression.argument, context);
			typ = null;
			if (arg.tree.type == 'Literal' && arg.tree.value > 0 && arg.tree.value <= 0x80000000) {
				typ = types.signed;
			} else if (arg.type.satisfies(types.int)) {
				typ = types.intish;
			} else {
				throw("Can't handle a NegationExpression with arg type: " + util.inspect(arg.type));
			}

			return {
				'tree': estree.UnaryExpression('-', arg.tree, true),
				'type': typ
			};
		case 'VariableExpression':
			var variable = context.localVariablesById[expression.variable.id];
			if (!variable) {
				variable = context.globalContext.globalVariablesById[expression.variable.id];

				if (!variable) {
					throw "Variable not found: " + util.inspect(expression.variable);
				}
			}
			return {
				'tree': estree.Identifier(variable.name),
				'type': variable.type,
				'intendedType': variable.intendedType
			};
		default:
			throw "Unexpected expression type: " + expression.expressionType;
	}
}

function coerce(expr, targetType) {
	if (expr.type.satisfies(targetType)) {
		return expr;
	} else if (expr.type.satisfies(types.intish) && types.signed.satisfies(targetType)) {
		/* coerce intish to signed using x | 0 */
		return {
			'tree': estree.BinaryExpression('|', expr.tree, estree.Literal(0)),
			'type': types.signed
		};
	} else {
		throw(
			util.format("Don't know how to coerce expression %s to type %s",
				util.inspect(expr),
				util.inspect(targetType)
			)
		);
	}
}

function getNumericLiteralValue(expr) {
	/* Try to interpret expr as a numeric literal, possibly represented as a unary minus
	expression. If successful, return its numeric value; if not, return null */
	if (expr.tree.type == 'Literal') {
		return expr.tree.value;
	}

	if (expr.tree.type == 'UnaryExpression' && expr.tree.operator == '-' && expr.tree.prefix) {
		var negatedArg = expr.tree.argument;
		if (negatedArg.type == 'Literal') {
			return -negatedArg.value;
		}
	}

	return null;
}

function compileStatement(statement, out, context) {
	var i, expr, exprTree, val;

	switch(statement.statementType) {
		case 'BlockStatement':
			var blockBody = [];
			for (i = 0; i < statement.statements.length; i++) {
				compileStatement(statement.statements[i], blockBody, context);
			}
			out.body.push(estree.BlockStatement(blockBody));
			return;
		case 'DeclarationStatement':
			/* Don't generate any code, but add to the list of variables that need
			declaring at the top of the function */
			for (i = 0; i < statement.variableDeclarations.length; i++) {
				var variableDeclaration = statement.variableDeclarations[i];

				var initialValueExpression;

				switch (statement.type.category) {
					case 'int':
						/* register as a local var of type 'int' */
						context.localVariablesById[variableDeclaration.variable.id] = {
							'name': variableDeclaration.variable.name,
							'type': types.int,
							'intendedType': types.signed
						};

						if (variableDeclaration.initialValueExpression === null) {
							/* output: var i = 0 */
							initialValueExpression = {
								'tree': estree.Literal(0)
							};
						} else {
							initialValueExpression = compileExpression(variableDeclaration.initialValueExpression, context);
							val = getNumericLiteralValue(initialValueExpression);
							assert(
								Number.isInteger(val) && val >= -0x80000000 && val < 0x100000000,
								util.format('Initial value for int declaration must be an integer literal, not %s', util.inspect(initialValueExpression))
							);
						}

						out.variableDeclarations.push(
							estree.VariableDeclarator(
								estree.Identifier(variableDeclaration.variable.name),
								initialValueExpression.tree
							)
						);

						break;
					default:
						throw "Don't know how to declare a local variable of type: " + util.inspect(statement.type);
				}
			}
			return;
		case 'ExpressionStatement':
			expr = compileExpression(statement.expression, context);
			out.body.push(estree.ExpressionStatement(expr.tree));
			return;
		case 'ReturnStatement':
			expr = compileExpression(statement.expression, context);

			/* add return type annotation to the expression, according to this function's
			return type */
			switch (context.returnType.category) {
				case 'signed':
					val = getNumericLiteralValue(expr);
					if (Number.isInteger(val) && val >= -0x80000000 && val < 0x80000000) {
						/* no annotation required */
						exprTree = expr.tree;
					} else {
						/* for all other expressions, annotate as (expr | 0) */
						exprTree = estree.BinaryExpression('|', expr.tree, estree.Literal(0));
					}
					break;
				default:
					throw "Don't know how to annotate a return value as type: " + util.inspect(context.returnType);
			}

			out.body.push(estree.ReturnStatement(exprTree));
			return;
		default:
			throw "Unexpected statement type: " + statement.statementType;
	}
}

function compileFunctionDefinition(functionDefinition, globalContext) {
	var returnType;

	/* convert return type from AST to a recognised asm.js type */
	switch (functionDefinition.returnType.category) {
		case 'int':
			returnType = types.signed;
			break;
		default:
			throw "Don't know how to handle return type: " + util.inspect(functionDefinition.returnType);
	}

	var context = {
		'globalContext': globalContext,
		'localVariablesById': {},
		'returnType': returnType
	};
	var i, parameterType, intendedParameterType;

	var parameterIdentifiers = [];
	var parameterDeclarations = [];
	var parameterTypes = [];

	for (i = 0; i < functionDefinition.parameters.length; i++) {
		var param = functionDefinition.parameters[i];
		parameterIdentifiers.push(
			estree.Identifier(param.name)
		);

		switch (param.type.category) {
			case 'int':
				/* register as a local var of type 'int' */
				parameterType = types.int;
				intendedParameterType = types.signed;

				/* annotate as i = i | 0 */
				parameterDeclarations.push(estree.ExpressionStatement(
					estree.AssignmentExpression(
						'=',
						estree.Identifier(param.name),
						estree.BinaryExpression(
							'|',
							estree.Identifier(param.name),
							estree.Literal(0)
						)
					)
				));
				break;
			default:
				throw "Don't know how to annotate a parameter of type: " + util.inspect(param.type);
		}

		context.localVariablesById[param.id] = {
			'name': param.name,
			'type': parameterType,
			'intendedType': intendedParameterType
		};
		parameterTypes.push(parameterType);
	}

	globalContext.globalVariablesById[functionDefinition.variable.id] = {
		'name': functionDefinition.variable.name,
		'type': types.func(returnType, parameterTypes)
	};

	var output = {
		'variableDeclarations': [],
		'body': []
	};

	for (i = 0; i < functionDefinition.body.length; i++) {
		compileStatement(functionDefinition.body[i], output, context);
	}

	var outputNodes;
	if (output.variableDeclarations.length) {
		outputNodes = parameterDeclarations.concat(
			[estree.VariableDeclaration(output.variableDeclarations)],
			output.body
		);
	} else {
		outputNodes = parameterDeclarations.concat(output.body);
	}

	return estree.FunctionDeclaration(
		estree.Identifier(functionDefinition.name),
		parameterIdentifiers,
		estree.BlockStatement(outputNodes)
	);
}

function compileModule(module) {
	var moduleBodyStatements = [
		estree.ExpressionStatement(estree.Literal("use asm"))
	];

	var exportTable = [
	];

	var globalContext = {
		'globalVariablesById': {}
	};

	for (var i = 0; i < module.declarations.length; i++) {
		var declaration = module.declarations[i];
		switch (declaration.declarationType) {
			case 'FunctionDefinition':
				moduleBodyStatements.push(
					compileFunctionDefinition(declaration, globalContext)
				);
				exportTable.push(estree.Property(
					estree.Identifier(declaration.name),
					estree.Identifier(declaration.name),
					'init'
				));
				break;
			default:
				throw "Unexpected declaration type: " + declaration.declarationType;
		}
	}

	moduleBodyStatements.push(
		estree.ReturnStatement(
			estree.ObjectExpression(exportTable)
		)
	);

	return estree.Program([
		estree.FunctionDeclaration(
			estree.Identifier('Module'),
			[],
			estree.BlockStatement(moduleBodyStatements)
		)
	]);
}

exports.compileModule = compileModule;
