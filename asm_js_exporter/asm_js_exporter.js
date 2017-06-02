var assert = require('assert');
var estree = require('./estree');

function compileExpression(expression) {
	switch(expression.expressionType) {
		case 'AddExpression':
			return estree.BinaryExpression('+',
				compileExpression(expression.left),
				compileExpression(expression.right)
			);
		case 'ConstExpression':
			return estree.Literal(expression.value);
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
	switch(statement.statementType) {
		case 'BlockStatement':
			var blockBody = [];
			for (var i = 0; i < statement.statements.length; i++) {
				compileStatement(statement.statements[i], blockBody, context);
			}
			out.push(estree.BlockStatement(blockBody));
			return;
		case 'ReturnStatement':
			var expr = compileExpression(statement.expression);

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
		'returnType': functionDefinition.returnType
	};
	compileStatement(functionDefinition.body, out, context);

	var body;
	/* body must be a single statement; wrap it in a BlockStatement if it isn't */
	if (out.length == 1) {
		body = out[0];
	} else {
		body = estree.BlockStatement(out);
	}

	return estree.FunctionDeclaration(
		estree.Identifier(functionDefinition.name),
		[],
		body
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
