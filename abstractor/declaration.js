var assert = require('assert');
var util = require('util');

var expressions = require('./expressions');
var cTypes = require('./c_types');


function variableDeclarationFromDeclarator(typ, declaratorNode, initialValueExpression, context) {
	var subDeclarator;
	switch (declaratorNode.type) {
		case 'Identifier':
			var identifier = declaratorNode.params[0];
			return {
				'variable': context.define(identifier, typ),
				'initialValueExpression': initialValueExpression
			};
		case 'ArrayDeclarator':
			subDeclarator = declaratorNode.params[0];
			var sizeExpr = declaratorNode.params[1];
			var size = expressions.constructExpression(sizeExpr, context, {
				'resultIsUsed': true
			});

			assert(initialValueExpression === null, "Array declarators with initial values are not supported yet");
			assert(size.isCompileTimeConstant);
			assert(size.type.category == 'int');
			assert(size.compileTimeConstantValue >= 0);

			var heapAllocationSize = size.compileTimeConstantValue * typ.size;
			var ptr = context.allocateFromHeap(heapAllocationSize);

			return variableDeclarationFromDeclarator(
				cTypes.pointer(typ), subDeclarator,
				new expressions.ConstExpression(ptr, cTypes.int, {
					'resultIsUsed': true
				}),
				context
			);
		case 'IndirectDeclarator':
			var pointerList = declaratorNode.params[0];
			subDeclarator = declaratorNode.params[1];
			for (var i = 0; i < pointerList.length; i++) {
				var pointer = pointerList[i];
				assert(pointer.type == 'Pointer');
				assert(pointer.params[0].length === 0, "Type qualifiers on pointers are not supported yet");
				typ = cTypes.pointer(typ);
			}

			return variableDeclarationFromDeclarator(
				typ, subDeclarator, initialValueExpression, context
			);
		default:
			throw(
				util.format("Don't know how to handle a declarator node of type %s",
					util.inspect(declaratorNode)
				)
			);
	}
}

function Declaration(node, context) {
	this.declarationType = 'VariableDeclaration';
	var declarationSpecifiersNode = node.params[0];
	var typ = cTypes.getTypeFromDeclarationSpecifiers(declarationSpecifiersNode);

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

		var declaratorNode = initDeclaratorNode.params[0];

		var initialValueNode = initDeclaratorNode.params[1];
		var initialValueExpression;
		if (initialValueNode === null) {
			initialValueExpression = null;
		} else {
			initialValueExpression = expressions.constructExpression(initialValueNode, context, {
				'resultIsUsed': true
			});
		}

		this.variableDeclarations.push(
			variableDeclarationFromDeclarator(typ, declaratorNode, initialValueExpression, context)
		);
	}
}
Declaration.prototype.inspect = function() {
	return util.format("VariableDeclaration: %s", util.inspect(this.variableDeclarations));
};
exports.Declaration = Declaration;
