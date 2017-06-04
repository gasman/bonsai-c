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
		case 'VariableExpression':
			return estree.Identifier(expression.variable.name);
		default:
			throw "Unexpected expression type: " + expression.expressionType;
	}
}

var MIN_INT = 1<<31;
var MAX_INT = ~MIN_INT;

function isIntegerLiteral(expr) {
	if (expr.type != 'Literal') return false;
	return (Number.isInteger(expr.value) && expr.value >= MIN_INT && expr.value <= MAX_INT);
}

function compileStatement(statement, out, context) {
	var i, expr;

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

				switch (statement.type) {
					case 'int':
						if (variableDeclaration.initialValueExpression === null) {
							/* output: var i = 0 */
							initialValueExpression = estree.Literal(0);
						} else {
							initialValueExpression = compileExpression(variableDeclaration.initialValueExpression);
							assert(
								isIntegerLiteral(initialValueExpression),
								util.format('Initial value for int declaration must be an integer literal, not %s', util.inspect(initialValueExpression))
							);
						}
						break;
					default:
						throw "Don't know how to declare a local variable of type: " + localVariable.type;
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
			switch (context.returnType) {
				case 'int':
					if (isIntegerLiteral(expr)) {
						/* integer literals don't require additional type annotation */
					} else {
						/* annotate expr as (expr | 0) */
						expr = estree.BinaryExpression('|', expr, estree.Literal(0));
					}
					break;
				default:
					throw "Don't know how to annotate a return value as type: " + context.returnType;
			}

			out.push(estree.ReturnStatement(expr));
			return;
		default:
			throw "Unexpected statement type: " + statement.statementType;
	}
}

function compileFunctionDefinition(functionDefinition) {
	var out = [];
	var context = {
		'localVariables': [],
		'returnType': functionDefinition.returnType
	};
	var i;
	for (i = 0; i < functionDefinition.body.length; i++) {
		compileStatement(functionDefinition.body[i], out, context);
	}

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
		out.unshift(estree.VariableDeclaration(declarations));
	}

	return estree.FunctionDeclaration(
		estree.Identifier(functionDefinition.name),
		[],
		estree.BlockStatement(out)
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
