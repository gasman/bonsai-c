var assert = require('assert');
var util = require('util');

var expressions = require('./expressions');
var cTypes = require('./c_types');


function Declaration(node, context) {
	this.declarationType = 'VariableDeclaration';
	var declarationSpecifiersNode = node.params[0];
	this.type = cTypes.getTypeFromDeclarationSpecifiers(declarationSpecifiersNode);

	this.variableDeclarations = [];

	var initDeclaratorNodes = node.params[1];
	assert(
		Array.isArray(initDeclaratorNodes),
		util.format(
			'DeclarationStatement expected an array of init declarators, got %s',
			util.inspect(initDeclaratorNodes)
		)
	);
	for (var i = 0; i < initDeclaratorNodes.length; i++) {
		var initDeclaratorNode = initDeclaratorNodes[i];

		assert(
			initDeclaratorNode.type == 'InitDeclarator',
			util.format('Expected an InitDeclarator node, got %s', util.inspect(initDeclaratorNode))
		);

		var identifierNode = initDeclaratorNode.params[0];
		assert(
			identifierNode.type == 'Identifier',
			util.format('Expected an Identifier node, got %s', util.inspect(identifierNode))
		);
		var identifier = identifierNode.params[0];

		var initialValueNode = initDeclaratorNode.params[1];
		var initialValueExpression;
		if (initialValueNode === null) {
			initialValueExpression = null;
		} else {
			initialValueExpression = expressions.constructExpression(initialValueNode, context, {
				'resultIsUsed': true
			});
		}

		this.variableDeclarations.push({
			'variable': context.define(identifier, this.type),
			'initialValueExpression': initialValueExpression
		});
	}
}
exports.Declaration = Declaration;
