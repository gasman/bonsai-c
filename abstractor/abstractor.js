var assert = require('assert');
var util = require('util');

var statements = require('./statements');

function FunctionDefinition(node) {
	this.declarationType = 'FunctionDefinition';

	var declarationSpecifiersNode = node.params[0];
	var storageClassSpecifiers = declarationSpecifiersNode.params[0];
	if (storageClassSpecifiers.length > 0) {
		throw(util.format(
			"Storage class specifiers are not yet supported - got %s",
			util.inspect(storageClassSpecifiers)
		));
	}
	var typeSpecifiers = declarationSpecifiersNode.params[1];
	if (typeSpecifiers.length != 1) {
		throw(util.format(
			"Multi-token type specifiers are not yet supported - got %s",
			util.inspect(typeSpecifiers)
		));
	}
	var token = typeSpecifiers[0];
	switch (token) {
		case 'int':
			this.returnType = 'int';
			break;
		default:
			throw "Unrecognised data type: " + token;
	}

	var declaratorNode = node.params[1];
	var identifierNode = declaratorNode.params[0];
	this.name = identifierNode.params[0];

	this.body = statements.constructStatement(node.params[3]);
}
FunctionDefinition.prototype.inspect = function() {
	return "FunctionDefinition <" + this.returnType + "> " + this.name + ": " + util.inspect(this.body);
};

function Module(declarationNodes) {
	assert(Array.isArray(declarationNodes),
		util.format('Module expected an array, got %s', util.inspect(declarationNodes))
	);

	this.declarations = [];

	for (var i = 0; i < declarationNodes.length; i++) {
		var node = declarationNodes[i];

		switch (node.type) {
			case 'FunctionDefinition':
				this.declarations.push(new FunctionDefinition(node));
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
