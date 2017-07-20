var assert = require('assert');
var estree = require('./estree');
var asmJsTypes = require('./asm_js_types');
var cTypes = require('../abstractor/c_types');
var expressions = require('./expressions');
var contextModule = require('./context');


function compileStatement(statement, out, context) {
	var i, expr, exprTree, val, testExpression, coercedExpr;

	switch(statement.statementType) {
		case 'BlockStatement':
			var blockOutput = [];
			for (i = 0; i < statement.statements.length; i++) {
				compileStatement(statement.statements[i], blockOutput, context);
			}
			out.push(estree.BlockStatement(blockOutput));
			return;
		case 'BreakStatement':
			out.push(estree.BreakStatement());
			return;
		case 'ContinueStatement':
			out.push(estree.ContinueStatement());
			return;
		case 'DeclarationStatement':
			for (i = 0; i < statement.variableDeclarations.length; i++) {
				var variableDeclaration = statement.variableDeclarations[i];

				/* if initial value expression is omitted or is a compile-time constant,
				just add this to the context's variableDeclarations and we're done;
				otherwise, also need to output an assignment expression to initialise it */

				var initialValue;
				var needsDynamicInitialisation = false;
				var dynamicInitialiserExpression;

				if (variableDeclaration.initialValueExpression === null) {
					initialValue = 0;
				} else if (variableDeclaration.initialValueExpression.isCompileTimeConstant) {
					initialValue = variableDeclaration.initialValueExpression.compileTimeConstantValue;
				} else {
					initialValue = 0;
					needsDynamicInitialisation = true;
					dynamicInitialiserExpression = expressions.compileExpression(
						variableDeclaration.initialValueExpression, context
					);
				}

				var variable = context.declareVariable(
					variableDeclaration.variable.name, variableDeclaration.variable.id,
					variableDeclaration.variable.type,
					initialValue
				);

				if (needsDynamicInitialisation) {
					out.push(
						estree.ExpressionStatement(
							expressions.AssignmentExpression(
								expressions.VariableExpression(variable),
								dynamicInitialiserExpression
							).tree
						)
					);
				}
			}
			return;
		case 'DoWhileStatement':
			bodyOutput = [];
			compileStatement(statement.body, bodyOutput, context);
			assert.equal(1, bodyOutput.length);
			condition = expressions.compileExpression(statement.condition, context);

			out.push(estree.DoWhileStatement(
				bodyOutput[0],
				condition.tree
			));
			return;
		case 'ExpressionStatement':
			expr = expressions.compileExpression(statement.expression, context);
			out.push(estree.ExpressionStatement(expr.tree));
			return;
		case 'ForStatement':
			var initOutput = [];
			compileStatement(statement.init, initOutput, context);

			var initExpressionTree = null;

			if (initOutput.length == 1) {
				/* init clause can go inside the for statement */
				assert(
					initOutput[0].type == 'ExpressionStatement',
					util.format("Expected ExpressionStatement to be generated as the init of a for loop - got %s",
						util.inspect(initOutput[0])
					)
				);
				initExpressionTree = initOutput[0].expression;
			} else {
				/* init clause has to go before the loop */
				for (i = 0; i < initOutput.length; i++) {
					out.push(initOutput[i]);
				}
			}

			var testExpressionTree = null;
			if (statement.test !== null) {
				testExpression = expressions.compileExpression(statement.test, context);
				testExpressionTree = testExpression.tree;
			}

			var updateExpressionTree = null;
			if (statement.update !== null) {
				var updateExpression = expressions.compileExpression(statement.update, context);
				updateExpressionTree = updateExpression.tree;
			}

			var bodyOutput = [];
			compileStatement(statement.body, bodyOutput, context);
			assert(bodyOutput.length == 1,
				"Expected for loop body to be a single statement, got " + util.inspect(bodyOutput)
			);
			var bodyStatement = bodyOutput[0];

			out.push(estree.ForStatement(
				initExpressionTree, testExpressionTree, updateExpressionTree,
				bodyStatement
			));
			return;
		case 'IfStatement':
			testExpression = expressions.compileExpression(statement.test, context);

			var thenOutput = [];
			compileStatement(statement.thenStatement, thenOutput, context);
			assert(thenOutput.length == 1,
				"Expected if-then clause to be a single statement, got " + util.inspect(thenOutput)
			);
			var thenStatement = thenOutput[0];

			var elseStatement = null;
			if (statement.elseStatement !== null) {
				var elseOutput = [];
				compileStatement(statement.elseStatement, elseOutput, context);
				assert(elseOutput.length == 1,
					"Expected if-else clause to be a single statement, got " + util.inspect(elseOutput)
				);
				elseStatement = elseOutput[0];
			}

			out.push(estree.IfStatement(
				testExpression.tree, thenStatement, elseStatement
			));
			return;
		case 'NullStatement':
			return;
		case 'ReturnStatement':
			if (statement.expression === null) {
				assert(
					context.returnType.category == 'void',
					util.format("Empty return statement encountered in context with return type: %s",
						util.inspect(context.returnType)
					)
				);
				exprTree = null;
			} else {
				/* add return type annotation to the expression, according to this function's
				return type */
				switch (context.returnType.category) {
					case 'signed':
						if (statement.expression.isCompileTimeConstant) {
							exprTree = expressions.ConstExpression(
								statement.expression.compileTimeConstantValue, cTypes.int
							).tree;
						} else {
							/* for all other expressions, annotate as (expr | 0),
							ensuring that expr is coerced to signed */
							expr = expressions.compileExpression(statement.expression, context);
							coercedExpr = expressions.coerce(expr, cTypes.int);
							if (coercedExpr.isAnnotatedAsSigned) {
								exprTree = coercedExpr.tree;
							} else {
								exprTree = estree.BinaryExpression('|', coercedExpr.tree, estree.Literal(0));
							}
						}
						break;
					case 'double':
						if (statement.expression.isCompileTimeConstant) {
							exprTree = expressions.ConstExpression(
								statement.expression.compileTimeConstantValue, cTypes.double
							).tree;
						} else {
							/* annotate as (+expr) */
							expr = expressions.compileExpression(statement.expression, context);
							coercedExpr = expressions.coerce(expr, cTypes.double);
							if (coercedExpr.isAnnotatedAsDouble) {
								exprTree = coercedExpr.tree;
							} else {
								exprTree = estree.UnaryExpression('+', expr.tree);
							}
						}
						break;
					default:
						throw "Don't know how to annotate a return value as type: " + util.inspect(context.returnType);
				}
			}

			out.push(estree.ReturnStatement(exprTree));
			return;
		case 'WhileStatement':
			condition = expressions.compileExpression(statement.condition, context);
			bodyOutput = [];
			compileStatement(statement.body, bodyOutput, context);
			assert.equal(1, bodyOutput.length);

			out.push(estree.WhileStatement(
				condition.tree,
				bodyOutput[0]
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
		case 'double':
			returnType = asmJsTypes.double;
			break;
		case 'void':
			returnType = asmJsTypes.void;
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
		var paramVariable;

		switch (originalParam.type.category) {
			case 'int':
				/* register as a local var of type 'int' */
				parameterType = asmJsTypes.int;
				paramVariable = context.allocateVariable(originalParam.name, parameterType, originalParam.type, originalParam.id);

				/* annotate as i = i | 0 */
				parameterDeclarations.push(estree.ExpressionStatement(
					estree.AssignmentExpression(
						'=',
						estree.Identifier(paramVariable.name),
						estree.BinaryExpression(
							'|',
							estree.Identifier(paramVariable.name),
							estree.Literal(0)
						)
					)
				));
				break;
			case 'double':
				/* register as a local var of type 'double' */
				parameterType = asmJsTypes.double;
				paramVariable = context.allocateVariable(originalParam.name, parameterType, originalParam.type, originalParam.id);

				/* annotate as i = +i */
				parameterDeclarations.push(estree.ExpressionStatement(
					estree.AssignmentExpression(
						'=',
						estree.Identifier(paramVariable.name),
						estree.UnaryExpression(
							'+',
							estree.Identifier(paramVariable.name)
						)
					)
				));
				break;
			default:
				throw "Don't know how to annotate a parameter of type: " + util.inspect(originalParam.type);
		}

		parameterIdentifiers.push(
			estree.Identifier(paramVariable.name)
		);
		parameterTypes.push(parameterType);
	}

	var functionVariable = globalContext.allocateVariable(
		functionDefinition.variable.name,
		asmJsTypes.func(returnType, parameterTypes),
		functionDefinition.type,
		functionDefinition.variable.id
	);

	var output = [];

	for (i = 0; i < functionDefinition.body.length; i++) {
		compileStatement(functionDefinition.body[i], output, context);
	}

	/* if function is non-void, and does not end with a return statement,
	add a dummy one to serve as a type annotation */
	if (!returnType.satisfies(asmJsTypes.void)) {
		var lastStatement = output[output.length - 1];
		if (!lastStatement || lastStatement.type != 'ReturnStatement') {
			if (returnType.satisfies(asmJsTypes.signed)) {
				output.push(estree.ReturnStatement(
					estree.Literal(0)
				));
			} else {
				throw "Unsupported return type: " + util.inspect(returnType);
			}
		}
	}

	var outputNodes;
	if (context.variableDeclarations.length) {
		outputNodes = parameterDeclarations.concat(
			[estree.VariableDeclaration(context.variableDeclarations)],
			output
		);
	} else {
		outputNodes = parameterDeclarations.concat(output);
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

	var globalContext = new contextModule.Context();

	var RESERVED_WORDS = ['stdlib', 'foreign', 'heap', 'HEAP_I32'];
	for (var w = 0; w < RESERVED_WORDS.length; w++) {
		globalContext.allocateVariable(RESERVED_WORDS[w]);
	}

	/* reserve 'imul' as a global variable (although it will need to be imported via
	globalContext.import('imul', ['stdlib', 'Math', 'imul']) to be valid to use in code)
	*/
	globalContext.allocateVariable('imul',
		asmJsTypes.func(asmJsTypes.signed, [asmJsTypes.int, asmJsTypes.int]),
		cTypes.func(cTypes.int, [cTypes.int, cTypes.int])
	);

	var functionDefinitionStatements = [];

	for (var i = 0; i < module.declarations.length; i++) {
		var declaration = module.declarations[i];
		switch (declaration.declarationType) {
			case 'FunctionDefinition':
				functionDefinitionStatements.push(
					compileFunctionDefinition(declaration, globalContext)
				);
				if (declaration.isExported) {
					exportTable.push(estree.Property(
						estree.Identifier(declaration.name),
						estree.Identifier(declaration.name),
						'init'
					));
				}
				break;
			case 'VariableDeclaration':
				for (j = 0; j < declaration.variableDeclarations.length; j++) {
					var variableDeclaration = declaration.variableDeclarations[j];

					var initialValue;

					if (variableDeclaration.initialValueExpression === null) {
						initialValue = 0;
					} else if (variableDeclaration.initialValueExpression.isCompileTimeConstant) {
						initialValue = variableDeclaration.initialValueExpression.compileTimeConstantValue;
					} else {
						throw(
							util.format(
								"Initial value for global variable is not a compile-time constant - got %s",
								util.inspect(variableDeclaration.initialValueExpression)
							)
						);
					}

					globalContext.declareVariable(
						variableDeclaration.variable.name, variableDeclaration.variable.id,
						variableDeclaration.variable.type,
						initialValue
					);
				}
				break;
			default:
				throw "Unexpected declaration type: " + declaration.declarationType;
		}
	}

	if (globalContext.variableDeclarations.length) {
		moduleBodyStatements.push(estree.VariableDeclaration(globalContext.variableDeclarations));
	}

	moduleBodyStatements = moduleBodyStatements.concat(functionDefinitionStatements);

	moduleBodyStatements.push(
		estree.ReturnStatement(
			estree.ObjectExpression(exportTable)
		)
	);

	return estree.Program([
		estree.FunctionDeclaration(
			estree.Identifier('Module'),
			[
				estree.Identifier('stdlib'),
				estree.Identifier('foreign'),
				estree.Identifier('heap')
			],
			estree.BlockStatement(moduleBodyStatements)
		)
	]);
}

exports.compileModule = compileModule;
