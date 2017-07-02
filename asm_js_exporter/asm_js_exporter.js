var assert = require('assert');
var estree = require('./estree');
var asmJsTypes = require('./asm_js_types');
var cTypes = require('../abstractor/c_types');
var expressions = require('./expressions');
var contextModule = require('./context');


function compileStatement(statement, out, context) {
	var i, expr, exprTree, val, testExpression;

	switch(statement.statementType) {
		case 'BlockStatement':
			var blockOutput = {
				'variableDeclarations': out.variableDeclarations,
				'body': []
			};
			for (i = 0; i < statement.statements.length; i++) {
				compileStatement(statement.statements[i], blockOutput, context);
			}
			out.body.push(estree.BlockStatement(blockOutput.body));
			return;
		case 'BreakStatement':
			out.body.push(estree.BreakStatement());
			return;
		case 'DeclarationStatement':
			/* Don't generate any code, but add to the list of variables that need
			declaring at the top of the function */
			for (i = 0; i < statement.variableDeclarations.length; i++) {
				var variableDeclaration = statement.variableDeclarations[i];

				var initialValueExpression = null;

				if (variableDeclaration.initialValueExpression !== null) {
					initialValueExpression = expressions.compileExpression(
						variableDeclaration.initialValueExpression, context, out
					);
				}

				context.declareLocalVariable(
					variableDeclaration.variable.name, variableDeclaration.variable.id,
					statement.type,
					initialValueExpression,
					out
				);
			}
			return;
		case 'ExpressionStatement':
			expr = expressions.compileExpression(statement.expression, context, out);
			out.body.push(estree.ExpressionStatement(expr.tree));
			return;
		case 'ForStatement':
			var initOutput = {
				'variableDeclarations': out.variableDeclarations,
				'body': []
			};
			compileStatement(statement.init, initOutput, context);

			var initExpressionTree = null;

			if (initOutput.body.length == 1) {
				/* init clause can go inside the for statement */
				assert(
					initOutput.body[0].type == 'ExpressionStatement',
					util.format("Expected ExpressionStatement to be generated as the init of a for loop - got %s",
						util.inspect(initOutput.body[0])
					)
				);
				initExpressionTree = initOutput.body[0].expression;
			} else {
				/* init clause has to go before the loop */
				out.body.concat(initOutput.body);
			}

			testExpression = expressions.compileExpression(statement.test, context, out);
			var updateExpression = expressions.compileExpression(statement.update, context, out);

			var bodyOutput = {
				'variableDeclarations': out.variableDeclarations,
				'body': []
			};
			compileStatement(statement.body, bodyOutput, context);
			assert(bodyOutput.body.length == 1,
				"Expected for loop body to be a single statement, got " + util.inspect(bodyOutput.body)
			);
			var bodyStatement = bodyOutput.body[0];

			out.body.push(estree.ForStatement(
				initExpressionTree, testExpression.tree, updateExpression.tree,
				bodyStatement
			));
			return;
		case 'IfStatement':
			testExpression = expressions.compileExpression(statement.test, context, out);

			var thenOutput = {
				'variableDeclarations': out.variableDeclarations,
				'body': []
			};
			compileStatement(statement.thenStatement, thenOutput, context);
			assert(thenOutput.body.length == 1,
				"Expected if-then clause to be a single statement, got " + util.inspect(thenOutput.body)
			);
			var thenStatement = thenOutput.body[0];

			var elseStatement = null;
			if (statement.elseStatement !== null) {
				var elseOutput = {
					'variableDeclarations': out.variableDeclarations,
					'body': []
				};
				compileStatement(statement.elseStatement, elseOutput, context);
				assert(elseOutput.body.length == 1,
					"Expected if-else clause to be a single statement, got " + util.inspect(elseOutput.body)
				);
				elseStatement = elseOutput.body[0];
			}

			out.body.push(estree.IfStatement(
				testExpression.tree, thenStatement, elseStatement
			));
			return;
		case 'NullStatement':
			return;
		case 'ReturnStatement':
			expr = expressions.compileExpression(statement.expression, context, out);

			/* add return type annotation to the expression, according to this function's
			return type */
			switch (context.returnType.category) {
				case 'signed':
					val = expr.numericLiteralValue;
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
		case 'WhileStatement':
			condition = expressions.compileExpression(statement.condition, context, out);
			bodyOutput = {
				'variableDeclarations': out.variableDeclarations,
				'body': []
			};
			compileStatement(statement.body, bodyOutput, context);
			assert.equal(1, bodyOutput.body.length);

			out.body.push(estree.WhileStatement(
				condition.tree,
				bodyOutput.body[0]
			));
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
			returnType = asmJsTypes.signed;
			break;
		default:
			throw "Don't know how to handle return type: " + util.inspect(functionDefinition.returnType);
	}

	var context = new contextModule.FunctionContext(globalContext, returnType);
	var i, parameterType;

	var parameterIdentifiers = [];
	var parameterDeclarations = [];
	var parameterTypes = [];

	for (i = 0; i < functionDefinition.parameters.length; i++) {
		var originalParam = functionDefinition.parameters[i];
		parameterIdentifiers.push(
			estree.Identifier(originalParam.name)
		);

		switch (originalParam.type.category) {
			case 'int':
				/* register as a local var of type 'int' */
				parameterType = asmJsTypes.int;

				/* annotate as i = i | 0 */
				parameterDeclarations.push(estree.ExpressionStatement(
					estree.AssignmentExpression(
						'=',
						estree.Identifier(originalParam.name),
						estree.BinaryExpression(
							'|',
							estree.Identifier(originalParam.name),
							estree.Literal(0)
						)
					)
				));
				break;
			default:
				throw "Don't know how to annotate a parameter of type: " + util.inspect(originalParam.type);
		}

		context.allocateLocalVariable(originalParam.name, parameterType, originalParam.type, originalParam.id);
		parameterTypes.push(parameterType);
	}

	var functionVariable = {
		'name': functionDefinition.variable.name,
		'type': asmJsTypes.func(returnType, parameterTypes),
		'intendedType': functionDefinition.type
	};
	globalContext.globalVariablesById[functionDefinition.variable.id] = functionVariable;
	globalContext.globalVariablesByName[functionDefinition.variable.name] = functionVariable;

	var output = {
		'variableDeclarations': [],
		'body': []
	};

	for (i = 0; i < functionDefinition.body.length; i++) {
		compileStatement(functionDefinition.body[i], output, context);
	}

	/* if function is non-void, and does not end with a return statement,
	add a dummy one to serve as a type annotation */
	var lastStatement = output.body[output.body.length - 1];
	if (!lastStatement || lastStatement.type != 'ReturnStatement') {
		if (returnType.satisfies(asmJsTypes.signed)) {
			output.body.push(estree.ReturnStatement(
				estree.Literal(0)
			));
		} else {
			throw "Unsupported return type: " + util.inspect(returnType);
		}
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
		'globalVariablesById': {},
		'globalVariablesByName': {}
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
