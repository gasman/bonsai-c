var assert = require('assert');
var util = require('util');

var statements = require('./statements');
var context = require('./context');
var types = require('./types');

function FunctionDefinition(node, parentContext) {
	this.declarationType = 'FunctionDefinition';

	var declarationSpecifiersNode = node.params[0];
	this.returnType = types.getTypeFromDeclarationSpecifiers(declarationSpecifiersNode);

	var declaratorNode = node.params[1];
	var identifierNode = declaratorNode.params[0];
	this.name = identifierNode.params[0];

	var functionContext = parentContext.createChildContext();

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
	return "FunctionDefinition <" + this.returnType + "> " + this.name + ": " + util.inspect(this.body);
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
			default:
				throw "Unexpected node type: " + node.type;
		}
	}
}
Module.prototype.inspect = function() {
	return "Module: " + util.inspect(this.declarations);
};

exports.Module = Module;
