var assert = require('assert');
var util = require('util');

var statements = require('./statements')

function FunctionDefinition(node) {
	this.declarationType = 'FunctionDefinition';
	var declaratorNode = node.params[1];
	var identifierNode = declaratorNode.params[0];
	this.name = identifierNode.params[0];

	this.body = statements.constructStatement(node.params[3]);
}
FunctionDefinition.prototype.inspect = function() {
	return "FunctionDefinition " + this.name + ": " + util.inspect(this.body);
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
