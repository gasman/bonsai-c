var assert = require('assert');
var estree = require('./estree');

function compileExpression(expression) {
	switch(expression.expressionType) {
		case 'ConstExpression':
			return estree.Literal(expression.value);
		default:
			throw "Unexpected expression type: " + expression.expressionType;
	}
}

function compileStatement(statement, out) {
	switch(statement.statementType) {
		case 'BlockStatement':
			var blockBody = [];
			for (var i = 0; i < statement.statements.length; i++) {
				compileStatement(statement.statements[i], blockBody);
			}
			out.push(estree.BlockStatement(blockBody));
			return;
		case 'ReturnStatement':
			out.push(estree.ReturnStatement(
				compileExpression(statement.expression)
			));
			return;
		default:
			throw "Unexpected statement type: " + statement.statementType;
	}
}

function compileFunctionDefinition(functionDefinition) {
	out = [];
	compileStatement(functionDefinition.body, out);

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
