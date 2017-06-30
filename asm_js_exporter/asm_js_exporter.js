var assert = require('assert');
var estree = require('./estree');
var asmJsTypes = require('./asm_js_types');
var cTypes = require('../abstractor/c_types');
var expressions = require('./expressions');


function compileStatement(statement, out, context) {
	var i, expr, exprTree, val;

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
		case 'DeclarationStatement':
			/* Don't generate any code, but add to the list of variables that need
			declaring at the top of the function */
			for (i = 0; i < statement.variableDeclarations.length; i++) {
				var variableDeclaration = statement.variableDeclarations[i];

				var initialValueExpression;

				switch (statement.type.category) {
					case 'int':
						/* register as a local var of type 'int', to be treated as signed */
						var variable = context.allocateLocalVariable(
							variableDeclaration.variable.name,
							asmJsTypes.int, statement.type,
							variableDeclaration.variable.id
						);

						if (variableDeclaration.initialValueExpression === null) {
							/* output: var i = 0 */
							initialValueExpression = expressions.ConstExpression(0, cTypes.int);
						} else {
							initialValueExpression = expressions.compileExpression(variableDeclaration.initialValueExpression, context, out);
							val = initialValueExpression.numericLiteralValue;
							if (Number.isInteger(val) && val >= -0x80000000 && val < 0x100000000) {
								/* initial value is a numeric literal in signed range - can use it directly
								in the variable declaration */
							} else {
								/* need to declare variable with a 'dummy' initial value of 0,
								then initialise it properly within the function body */
								out.body.push(
									estree.ExpressionStatement(
										expressions.AssignmentExpression(
											expressions.VariableExpression(variable),
											initialValueExpression
										).tree
									)
								);
								initialValueExpression = expressions.ConstExpression(0, cTypes.int);
							}
						}

						out.variableDeclarations.push(
							estree.VariableDeclarator(
								estree.Identifier(variable.name),
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
			expr = expressions.compileExpression(statement.expression, context, out);
			out.body.push(estree.ExpressionStatement(expr.tree));
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

function FunctionContext(globalContext, returnType) {
	this.globalContext = globalContext;
	this.returnType = returnType;
	this.localVariablesById = {};
	this.localVariablesByName = {};
}
FunctionContext.prototype.get = function(id) {
	var variable = this.globalContext.globalVariablesById[id];
	if (variable) {
		return variable;
	} else {
		return this.localVariablesById[id];
	}
};
FunctionContext.prototype.allocateLocalVariable = function(suggestedName, typ, intendedType, id) {
	var suffixIndex = 0;
	var candidateName = suggestedName;
	while (
		candidateName in this.globalContext.globalVariablesByName ||
		candidateName in this.localVariablesByName
	) {
		candidateName = suggestedName + '_' + suffixIndex;
		suffixIndex++;
	}
	var variable = {
		'name': candidateName,
		'type': typ,
		'intendedType': intendedType
	};
	this.localVariablesByName[candidateName] = variable;
	if (id !== null) {
		this.localVariablesById[id] = variable;
	}
	return variable;
};

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

	var context = new FunctionContext(globalContext, returnType);
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
