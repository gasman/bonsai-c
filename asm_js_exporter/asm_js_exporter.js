var assert = require('assert');
var estree = require('./estree');

function compileExpression(expression) {
	switch(expression.expressionType) {
		case 'AddExpression':
			return estree.BinaryExpression('+',
				compileExpression(expression.left),
				compileExpression(expression.right)
			);
		case 'AssignmentExpression':
			return estree.AssignmentExpression('=',
				compileExpression(expression.left),
				compileExpression(expression.right)
			);
		case 'ConstExpression':
			return estree.Literal(expression.value);
		case 'FunctionCallExpression':
			var callee = compileExpression(expression.callee);
			var args = [];
			for (var i = 0; i < expression.parameters.length; i++) {
				args.push(compileExpression(expression.parameters[i]));
			}
			return estree.CallExpression(callee, args);
		case 'NegationExpression':
			return estree.UnaryExpression('-',
				compileExpression(expression.argument),
				true
			);
		case 'VariableExpression':
			return estree.Identifier(expression.variable.name);
		default:
			throw "Unexpected expression type: " + expression.expressionType;
	}
}

function getNumericLiteralValue(expr) {
	/* Try to interpret expr as a numeric literal, possibly represented as a unary minus
	expression. If successful, return its numeric value; if not, return null */
	if (expr.type == 'Literal') {
		return expr.value;
	}

	if (expr.type == 'UnaryExpression' && expr.operator == '-' && expr.prefix) {
		var negatedArg = expr.argument;
		if (negatedArg.type == 'Literal') {
			return -negatedArg.value;
		}
	}

	return null;
}

function compileStatement(statement, out, context) {
	var i, expr, val;

	switch(statement.statementType) {
		case 'BlockStatement':
			var blockBody = [];
			for (i = 0; i < statement.statements.length; i++) {
				compileStatement(statement.statements[i], blockBody, context);
			}
			out.push(estree.BlockStatement(blockBody));
			return;
		case 'DeclarationStatement':
			/* Don't generate any code, but add to the list of variables that need
			declaring at the top of the function */
			for (i = 0; i < statement.variableDeclarations.length; i++) {
				var variableDeclaration = statement.variableDeclarations[i];

				var initialValueExpression;

				switch (statement.type.category) {
					case 'int':
						if (variableDeclaration.initialValueExpression === null) {
							/* output: var i = 0 */
							initialValueExpression = estree.Literal(0);
						} else {
							initialValueExpression = compileExpression(variableDeclaration.initialValueExpression);
							val = getNumericLiteralValue(initialValueExpression);
							assert(
								Number.isInteger(val) && val >= -0x80000000 && val < 0x100000000,
								util.format('Initial value for int declaration must be an integer literal, not %s', util.inspect(initialValueExpression))
							);
						}
						break;
					default:
						throw "Don't know how to declare a local variable of type: " + util.inspect(statement.type);
				}

				context.localVariables.push({
					'name': variableDeclaration.variable.name,
					'type': statement.type,
					'initialValueExpression': initialValueExpression
				});
			}
			return;
		case 'ExpressionStatement':
			expr = compileExpression(statement.expression);
			out.push(estree.ExpressionStatement(expr));
			return;
		case 'ReturnStatement':
			expr = compileExpression(statement.expression);

			/* add return type annotation to the expression, according to this function's
			return type */
			switch (context.returnType.category) {
				case 'int':
					val = getNumericLiteralValue(expr);
					if (Number.isInteger(val) && val >= -0x80000000 && val < 0x80000000) {
						/* no annotation required */
					} else {
						/* for all other expressions, annotate as (expr | 0) */
						expr = estree.BinaryExpression('|', expr, estree.Literal(0));
					}
					break;
				default:
					throw "Don't know how to annotate a return value as type: " + util.inspect(context.returnType);
			}

			out.push(estree.ReturnStatement(expr));
			return;
		default:
			throw "Unexpected statement type: " + statement.statementType;
	}
}

function compileFunctionDefinition(functionDefinition) {
	var body = [];
	var context = {
		'localVariables': [],
		'returnType': functionDefinition.returnType
	};
	var i;

	var parameterIdentifiers = [];
	var parameterDeclarations = [];
	for (i = 0; i < functionDefinition.parameters.length; i++) {
		var param = functionDefinition.parameters[i];
		parameterIdentifiers.push(
			estree.Identifier(param.name)
		);

		switch (param.type.category) {
			case 'int':
				/* i = i | 0 */
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
	}

	for (i = 0; i < functionDefinition.body.length; i++) {
		compileStatement(functionDefinition.body[i], body, context);
	}

	var variableDeclarations;

	if (context.localVariables.length > 0) {
		var declarations = [];
		for (i = 0; i < context.localVariables.length; i++) {
			var localVariable = context.localVariables[i];
			declarations.push(
				estree.VariableDeclarator(
					estree.Identifier(localVariable.name),
					localVariable.initialValueExpression
				)
			);
		}
		variableDeclarations = [estree.VariableDeclaration(declarations)];
	} else {
		variableDeclarations = [];
	}

	var output = parameterDeclarations.concat(variableDeclarations, body);

	return estree.FunctionDeclaration(
		estree.Identifier(functionDefinition.name),
		parameterIdentifiers,
		estree.BlockStatement(output)
	);
}

function compileModule(module) {
	var moduleBodyStatements = [
		estree.ExpressionStatement(estree.Literal("use asm"))
	];

	var exportTable = [
	];

	for (var i = 0; i < module.declarations.length; i++) {
		var declaration = module.declarations[i];
		switch (declaration.declarationType) {
			case 'FunctionDefinition':
				moduleBodyStatements.push(
					compileFunctionDefinition(declaration)
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
