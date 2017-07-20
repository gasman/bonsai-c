var asmJsTypes = require('./asm_js_types');
var expressions = require('./expressions');
var cTypes = require('../abstractor/c_types');
var estree = require('./estree');

function Context(parentContext) {
	this.parentContext = parentContext;
	this.variablesById = {};
	this.variablesByName = {};
	this.variableDeclarations = [];
}
Context.prototype.get = function(id) {
	var variable = this.variablesById[id];
	if (variable) {
		return variable;
	} else if (this.parentContext) {
		return this.parentContext.get(id);
	}
};
Context.prototype.nameIsUsed = function(name) {
	if (name in this.variablesByName) {
		return true;
	} else if (this.parentContext) {
		return this.parentContext.nameIsUsed(name);
	} else {
		return false;
	}
};
Context.prototype.allocateVariable = function(suggestedName, typ, intendedType, id) {
	var suffixIndex = 0;
	var candidateName = suggestedName;
	while (this.nameIsUsed(candidateName)) {
		candidateName = suggestedName + '_' + suffixIndex;
		suffixIndex++;
	}
	var variable = {
		'name': candidateName,
		'type': typ,
		'intendedType': intendedType
	};
	this.variablesByName[candidateName] = variable;
	if (id !== null) {
		this.variablesById[id] = variable;
	}
	return variable;
};
Context.prototype.declareVariable = function(suggestedName, id, intendedType, initialValue) {
	var variable, assignedType;

	switch (intendedType.category) {
		case 'int':
			/* register as a local var of type 'int', to be treated as signed */
			assignedType = asmJsTypes.int;
			break;
		case 'double':
			/* register as a local var of type 'double' */
			assignedType = asmJsTypes.double;
			break;
		default:
			throw "Don't know how to declare a local variable of type: " + util.inspect(intendedType);
	}

	variable = this.allocateVariable(
		suggestedName, assignedType, intendedType, id
	);

	this.variableDeclarations.push(
		estree.VariableDeclarator(
			estree.Identifier(variable.name),
			expressions.ConstExpression(initialValue, intendedType).tree
		)
	);

	return variable;
};

exports.Context = Context;

function FunctionContext(parentContext, returnType) {
	var context = new Context(parentContext);
	context.returnType = returnType;
	return context;
}

exports.FunctionContext = FunctionContext;
