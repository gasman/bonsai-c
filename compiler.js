var assert = require('assert');
var util = require('util');
var types = require('./types');

function Context(returnType, variableTypes) {
	this.returnType = returnType;
	this.variableTypes = variableTypes;
}
Context.prototype.copy = function() {
	var variableTypes = {};
	for (var prop in this.variableTypes) {
		variableTypes[prop] = this.variableTypes[prop];
	}
	return new Context(this.returnType, variableTypes);
}

function indent(code) {
	lines = code.split('\n');
	for (var i = 0; i < lines.length; i++) {
		if (lines[i] !== '') {
			lines[i] = '\t' + lines[i];
		}
	}
	return lines.join('\n');
}

function parameterListIsVoid(parameterList) {
	if (parameterList.length != 1) return false;
	var parameter = parameterList[0];
	if (parameter.type != 'TypeOnlyParameterDeclaration') return false;
	var parameterTypeSpecifiers = parameter.params[0];
	if (!types.equal(
		types.getTypeFromDeclarationSpecifiers(parameterTypeSpecifiers),
		types.void
	)) {
		return false;
	}

	return true;
}

function compileConstExpression(expr, expectedType) {
	assert.equal('Const', expr.type);
	var numString = expr.params[0];
	if (expectedType !== null && types.equal(expectedType, types.int) && numString.match(/^\d+$/)) {
		return numString;
	} else {
		throw("Cannot compile " + numString + " as type " + utils.inspect(expectedType));
	}
}

function compileExpression(expr, expectedType, context) {
	var identifier, varType;

	switch (expr.type) {
		case 'Add':
			/* TODO: check that types match, when expectedType is null */
			var l = compileExpression(expr.params[0], expectedType, context);
			var r = compileExpression(expr.params[1], expectedType, context);
			return '(' + l + ') + (' + r + ')';
		case 'Assign':
			var lvalue = expr.params[0];
			var operator = expr.params[1];
			var rvalue = expr.params[2];

			assert.equal('Var', lvalue.type,
				"Assignments to non-simple vars are not yet implemented"
			);
			identifier = lvalue.params[0];
			assert.equal('=', operator,
				"Assignment operators other than '=' are not yet implemented"
			);

			assert(identifier in context.variableTypes, "Undefined variable: " + identifier);
			varType = context.variableTypes[identifier];
			if (expectedType !== null) {
				assert(types.equal(expectedType, varType));
			}
			return identifier + ' = (' + compileExpression(rvalue, varType, context) + ')';
		case 'Const':
			return compileConstExpression(expr, expectedType);
		case 'Var':
			identifier = expr.params[0];
			assert(identifier in context.variableTypes, "Undefined variable: " + identifier);
			varType = context.variableTypes[identifier];
			if (expectedType !== null) {
				assert(types.equal(expectedType, varType));
			}
			return identifier;
		default:
			throw("Unimplemented expression type: " + expr.type);
	}
}

function compileReturnExpression(expr, context) {
	if (expr.type == 'Const' && types.equal(context.returnType, types.int)) {
		/* no type annotation necessary - just return the literal */
		return compileConstExpression(expr, context.returnType);
	} else {
		switch (context.returnType.category) {
			case 'int':
				return '(' + compileExpression(expr, context.returnType, context) + ')|0';
			default:
				throw("Unimplemented return type: " + utils.inspect(context.returnType));
		}
	}
}

function compileStatement(statement, context) {
	switch (statement.type) {
		case 'ExpressionStatement':
			return compileExpression(statement.params[0], null, context) + ';\n';
		case 'Return':
			var returnValue = statement.params[0];
			return 'return ' + compileReturnExpression(returnValue, context) + ';\n';
		default:
			throw("Unsupported statement type: " + statement.type);
	}
}

function compileBlock(block, parentContext, outputBraces) {
	var i, j;
	assert.equal('Block', block.type);

	var context = parentContext.copy();

	var declarationList = block.params[0];
	var statementList = block.params[1];

	var out = '';

	assert(Array.isArray(declarationList));
	for (i = 0; i < declarationList.length; i++) {
		var declaration = declarationList[i];
		assert.equal('Declaration', declaration.type);
		
		var declarationSpecifiers = declaration.params[0];
		var initDeclaratorList = declaration.params[1];

		var declarationType = types.getTypeFromDeclarationSpecifiers(declarationSpecifiers);

		assert(Array.isArray(initDeclaratorList));
		for (j = 0; j < initDeclaratorList.length; j++) {
			var initDeclarator = initDeclaratorList[j];
			assert.equal('InitDeclarator', initDeclarator.type);

			var declarator = initDeclarator.params[0];
			var initialValue = initDeclarator.params[1];

			assert.equal('Identifier', declarator.type);
			var identifier = declarator.params[0];

			context.variableTypes[identifier] = declarationType;

			if (types.equal(declarationType, types.int) && initialValue === null) {
				out += 'var ' + identifier + ' = 0;\n';
			} else if (types.equal(declarationType, types.int) && initialValue.type == 'Const') {
				out += 'var ' + identifier + ' = ' + compileConstExpression(initialValue, declarationType) + ';\n';
			} else {
				throw(util.format(
					"Unsupported declaration type: %s with initial value %s",
					util.inspect(declarationType),
					util.inspect(initialValue)
				));
			}
		}
	}

	assert(Array.isArray(statementList));

	for (i = 0; i < statementList.length; i++) {
		out += compileStatement(statementList[i], context);
	}

	if (outputBraces) {
		return '{\n' + indent(out) + '}\n';
	} else {
		return out;
	}
}

function FunctionDefinition(node) {
	assert.equal('FunctionDefinition', node.type);
	var declarationSpecifiers = node.params[0];
	var declarator = node.params[1];
	var declarationList = node.params[2];
	this.body = node.params[3];

	this.returnType = types.getTypeFromDeclarationSpecifiers(declarationSpecifiers);

	assert.equal('FunctionDeclarator', declarator.type);
	var nameDeclarator = declarator.params[0];
	var parameterList = declarator.params[1];

	assert.equal('Identifier', nameDeclarator.type);
	this.name = nameDeclarator.params[0];

	assert(Array.isArray(parameterList));
	this.parameters = [];
	var parameterTypes = [];

	if (!parameterListIsVoid(parameterList)) {
		for (var i = 0; i < parameterList.length; i++) {
			var parameterDeclaration = parameterList[i];
			assert.equal('ParameterDeclaration', parameterDeclaration.type);

			var parameterType = types.getTypeFromDeclarationSpecifiers(parameterDeclaration.params[0]);
			parameterTypes.push(parameterType);

			var parameterIdentifier = parameterDeclaration.params[1];
			assert.equal('Identifier', parameterIdentifier.type);
			var ident = parameterIdentifier.params[0];

			this.parameters.push({
				'identifier': ident,
				'type': parameterType
			});
		}
	}
	this.type = types.func(this.returnType, parameterTypes);

	assert(Array.isArray(declarationList));
	assert.equal(0, declarationList.length);
}
FunctionDefinition.prototype.compile = function(parentContext) {
	var context = parentContext.copy();
	context.returnType = this.returnType;

	var paramNames = [];
	var paramAnnotations = [];
	for (var i = 0; i < this.parameters.length; i++) {
		var param = this.parameters[i];
		context.variableTypes[param.identifier] = param.type;
		paramNames.push(param.identifier);

		switch(param.type.category) {
			case 'int':
				paramAnnotations.push(param.identifier + ' = ' + param.identifier + '|0;\n');
				break;
			default:
				throw "Parameter type annotation not yet implemented: " + util.inspect(param.type);
		}
	}

	var out = 'function ' + this.name + '(' + paramNames.join(', ') + ') {\n';
	if (paramAnnotations.length) {
		out += indent(paramAnnotations.join('')) + '\n';
	};

	out += indent(compileBlock(this.body, context, false));
	out += '}\n';

	return out;
};

function compileModule(name, ast) {
	assert(Array.isArray(ast),
		util.format('compileModule expected an array, got %s', util.inspect(ast))
	);

	var i, fd;
	var functionDefinitions = [];
	var context = new Context(null, {});

	var out = 'function ' + name + '() {\n\t"use asm";\n\n';

	for (i = 0; i < ast.length; i++) {
		switch (ast[i].type) {
			case 'FunctionDefinition':
				fd = new FunctionDefinition(ast[i]);
				functionDefinitions.push(fd);
				context.variableTypes[fd.name] = fd.type;
				break;
			default:
				throw "Unexpected node type: " + ast[i].type;
		}
	}

	for (i = 0; i < functionDefinitions.length; i++) {
		fd = functionDefinitions[i];
		out += indent(fd.compile(context)) + '\n';
	}

	out += "\treturn {\n";
	for (i = 0; i < functionDefinitions.length; i++) {
		fd = functionDefinitions[i];
		out += "\t\t" + fd.name + ': ' + fd.name + (i < functionDefinitions.length - 1 ? ',\n' : '\n');
	}
	out += "\t};\n";

	out += "}\n";
	return out;
}

exports.compileModule = compileModule;
