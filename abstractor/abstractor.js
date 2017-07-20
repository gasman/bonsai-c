var assert = require('assert');
var util = require('util');

var declaration = require('./declaration');
var statements = require('./statements');
var context = require('./context');
var cTypes = require('./c_types');

function parameterDeclarationIsVoid(nodeList) {
	/* return true if the parameter declaration consists of "(void)" */
	if (nodeList.length != 1) return false;
	if (nodeList[0].type != 'TypeOnlyParameterDeclaration') return false;
	var declarationSpecifiersNode = nodeList[0].params[0];
	return (cTypes.getTypeFromDeclarationSpecifiers(declarationSpecifiersNode).category == 'void');
}

function FunctionDefinition(node, parentContext) {
	this.declarationType = 'FunctionDefinition';

	var declarationSpecifiersNode = node.params[0];
	var storageClassSpecifiers = declarationSpecifiersNode.params[0];
	var typeSpecifiers = declarationSpecifiersNode.params[1];

	if (storageClassSpecifiers.length === 0) {
		this.isExported = true;
	} else if (storageClassSpecifiers.length === 1 && storageClassSpecifiers[0] == 'static') {
		this.isExported = false;
	} else {
		throw(
			util.format(
				"Don't know how to handle storage class specifiers: %s",
				util.inspect(storageClassSpecifiers)
			)
		);
	}
	this.returnType = cTypes.getTypeFromTypeSpecifiers(typeSpecifiers);

	var declaratorNode = node.params[1];
	var identifierNode = declaratorNode.params[0];
	this.name = identifierNode.params[0];
	var parameterDeclarationNodes = declaratorNode.params[1];

	assert(
		node.params[2].length === 0,
		"Non-empty declarator list on function definition is not supported"
	);

	var functionContext = parentContext.createChildContext();

	this.parameters = [];
	this.parameterTypes = [];

	if (parameterDeclarationNodes.length > 0 && !parameterDeclarationIsVoid(parameterDeclarationNodes)) {
		for (var i = 0; i < parameterDeclarationNodes.length; i++) {
			var paramDeclarationNode = parameterDeclarationNodes[i];
			var paramDeclarationSpecifiersNode = paramDeclarationNode.params[0];
			var paramType = cTypes.getTypeFromDeclarationSpecifiers(paramDeclarationSpecifiersNode);
			var paramIdentifierNode = paramDeclarationNode.params[1];
			var paramIdentifier = paramIdentifierNode.params[0];

			this.parameters.push(functionContext.define(paramIdentifier, paramType));
			this.parameterTypes.push(paramType);
		}
	}

	this.type = cTypes.func(this.returnType, this.parameterTypes);
	this.variable = parentContext.define(this.name, this.type);

	var body = statements.constructStatement(node.params[3], functionContext);
	/* we want body to be a list of statements, so if it's a block statement, unwrap it;
	for any other statement type, wrap it as a singleton list */
	if (body.statementType == 'BlockStatement') {
		this.body = body.statements;
	} else {
		this.body = [body];
	}
}
FunctionDefinition.prototype.inspect = function() {
	return "FunctionDefinition <" + util.inspect(this.returnType) + "> " + this.name + " (" + util.inspect(this.parameters) + "): " + util.inspect(this.body);
};

function Module(declarationNodes) {
	assert(Array.isArray(declarationNodes),
		util.format('Module expected an array, got %s', util.inspect(declarationNodes))
	);

	this.declarations = [];

	var globalContext = new context.Context();

	for (var i = 0; i < declarationNodes.length; i++) {
		var node = declarationNodes[i];

		switch (node.type) {
			case 'FunctionDefinition':
				this.declarations.push(new FunctionDefinition(node, globalContext));
				break;
			case 'Declaration':
				this.declarations.push(new declaration.Declaration(node, globalContext));
				break;
			default:
				throw "Unexpected node type: " + node.type;
		}
	}
}
Module.prototype.inspect = function() {
	return "Module: " + util.inspect(this.declarations);
};

exports.Module = Module;
