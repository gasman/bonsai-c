var assert = require('assert');
var util = require('util');

function indent(code) {
	lines = code.split('\n');
	for (var i = 0; i < lines.length; i++) {
		if (lines[i] !== '') {
			lines[i] = '\t' + lines[i];
		}
	}
	return lines.join('\n');
}

function getTypeFromDeclarationSpecifiers(declarationSpecifiers) {
	assert(Array.isArray(declarationSpecifiers),
		util.format(
			'getTypeFromDeclarationSpecifiers expected an array, got %s',
			util.inspect(declarationSpecifiers)
		)
	);

	if (declarationSpecifiers.length != 1) {
		throw(util.format(
			"Multi-token declaration specifiers are not yet supported - got %s",
			util.inspect(declarationSpecifiers)
		));
	}

	var token = declarationSpecifiers[0];
	return token;
}

function parameterListIsVoid(parameterList) {
	if (parameterList.length != 1) return false;
	var parameter = parameterList[0];
	if (parameter.type != 'TypeOnlyDeclarationSpecifier') return false;
	var parameterTypeSpecifiers = parameter.params[0];
	if (getTypeFromDeclarationSpecifiers(parameterTypeSpecifiers) != 'void') {
		return false;
	}

	return true;
}

function compileConstExpression(expr, expectedType) {
	assert.equal('Const', expr.type);
	var numString = expr.params[0];
	if (expectedType == 'int' && numString.match(/^\d+$/)) {
		return numString;
	} else {
		throw("Cannot compile " + numString + " as type " + expectedType);
	}
}

function compileExpression(expr, expectedType) {
	switch (expr.type) {
		case 'Add':
			var l = compileExpression(expr.params[0], expectedType);
			var r = compileExpression(expr.params[1], expectedType);
			return '(' + l + ') + (' + r + ')';
		case 'Const':
			return compileConstExpression(expr, expectedType);
		default:
			throw("Unimplemented expression type: " + expr.type);
	}
}

function compileReturnExpression(expr, returnType) {
	if (expr.type == 'Const' && returnType == 'int') {
		/* no type annotation necessary - just return the literal */
		return compileConstExpression(expr, returnType);
	} else {
		switch (returnType) {
			case 'int':
				return '(' + compileExpression(expr, returnType) + ')|0';
			default:
				throw("Unimplemented return type: " + returnType);
		}
	}
}

function compileStatement(statement, context) {
	switch (statement.type) {
		case 'Return':
			var returnValue = statement.params[0];
			return 'return ' + compileReturnExpression(returnValue, context.returnType) + ';\n';
		default:
			throw("Unsupported statement type: " + statement.type);
	}
}

function compileBlock(block, context) {
	assert.equal('Block', block.type);

	var declarationList = block.params[0];
	var statementList = block.params[1];

	assert(Array.isArray(declarationList));
	assert.equal(0, declarationList.length);

	assert(Array.isArray(statementList));

	var out = '{\n';
	for (var i = 0; i < statementList.length; i++) {
		out += indent(compileStatement(statementList[i], context));
	}
	out += '}\n';
	return out;
}

function FunctionDefinition(node) {
	assert.equal('FunctionDefinition', node.type);
	var declarationSpecifiers = node.params[0];
	var declarator = node.params[1];
	var declarationList = node.params[2];
	this.body = node.params[3];

	this.returnType = getTypeFromDeclarationSpecifiers(declarationSpecifiers);

	assert.equal('FunctionDeclarator', declarator.type);
	var nameDeclarator = declarator.params[0];
	var parameterList = declarator.params[1];

	assert.equal('Identifier', nameDeclarator.type);
	this.name = nameDeclarator.params[0];

	assert(Array.isArray(parameterList));
	/* for now, we'll only support void parameter lists */
	assert(
		parameterListIsVoid(parameterList),
		"Non-void parameter lists are not implemented yet"
	);

	assert(Array.isArray(declarationList));
	assert.equal(0, declarationList.length);
}
FunctionDefinition.prototype.compile = function() {
	var context = {
		'returnType': this.returnType
	};

	return 'function ' + this.name + '() ' + compileBlock(this.body, context);
};

function compileModule(name, ast) {
	assert(Array.isArray(ast),
		util.format('compileModule expected an array, got %s', util.inspect(ast))
	);

	var i;
	var functionDefinitions = [];

	var out = 'function ' + name + '() {\n\t"use asm";\n\n';

	for (i = 0; i < ast.length; i++) {
		switch (ast[i].type) {
			case 'FunctionDefinition':
				var functionDefinition = new FunctionDefinition(ast[i]);
				functionDefinitions.push(functionDefinition);
				out += indent(functionDefinition.compile()) + '\n';
				break;
			default:
				throw "Unexpected node type: " + ast[i].type;
		}
	}

	out += "\treturn {\n";
	for (i = 0; i < functionDefinitions.length; i++) {
		var fd = functionDefinitions[i];
		out += "\t\t" + fd.name + ': ' + fd.name + (i < functionDefinitions.length - 1 ? ',\n' : '\n');
	}
	out += "\t};\n";

	out += "}\n";
	return out;
}

exports.compileModule = compileModule;
