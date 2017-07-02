var asmJsTypes = require('./asm_js_types');
var expressions = require('./expressions');
var cTypes = require('../abstractor/c_types');
var estree = require('./estree');

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
FunctionContext.prototype.declareLocalVariable = function(suggestedName, id, intendedType, initialValueExpression, out) {
	var actualType, canDeclareDirectly, val;

	switch (intendedType.category) {
		case 'int':
			/* register as a local var of type 'int', to be treated as signed */
			var variable = this.allocateLocalVariable(
				suggestedName, asmJsTypes.int, intendedType, id
			);

			/* can declare directly if initialValueExpression is null
			or a numeric literal in signed range */
			if (initialValueExpression === null) {
				/* output: var i = 0 */
				initialValueExpression = expressions.ConstExpression(0, cTypes.int);
			} else {
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

			break;
		default:
			throw "Don't know how to declare a local variable of type: " + util.inspect(statement.type);
	}

	out.variableDeclarations.push(
		estree.VariableDeclarator(
			estree.Identifier(variable.name),
			initialValueExpression.tree
		)
	);

	return variable;
};

exports.FunctionContext = FunctionContext;
