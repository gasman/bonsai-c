var assert = require('assert');

var asmJsTypes = require('./asm_js_types');
var expressions = require('./expressions');
var cTypes = require('../abstractor/c_types');
var estree = require('./estree');

function Context(parentContext) {
	this.parentContext = parentContext;
	if (this.parentContext) {
		this.globalContext = this.parentContext.globalContext;
	} else {
		this.globalContext = this;
	}
	this.variablesById = {};
	this.variablesByName = {};
	this.variableDeclarations = [];
	this.importedNames = {};
}
Context.prototype.get = function(id) {
	var variable = this.variablesById[id];
	if (variable) {
		return variable;
	} else if (this.parentContext) {
		return this.parentContext.get(id);
	}
};
Context.prototype.getByName = function(name) {
	if (name in this.variablesByName) {
		return this.variablesByName[name];
	} else if (this.parentContext) {
		return this.parentContext.getByName(name);
	}
};
Context.prototype.allocateVariable = function(suggestedName, typ, intendedType, id) {
	var suffixIndex = 0;
	var candidateName = suggestedName;
	while (this.getByName(candidateName)) {
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

Context.prototype.import = function(name, path) {
	/* Add a variable declaration (if one does not exist already) for 'name',
	pointing to the external reference 'path' (a list of path components such as
	['stdlib', 'Math', 'imul']). The variable must have previously been allocated
	via allocateVariable; we return that variable. */

	if (name in this.importedNames) return;

	var variable = this.getByName(name);
	assert(variable, "Variable " + name + " has not been allocated");

	/* convert a path into the estree representation for (e.g.) stdlib.Math.imul:
	estree.MemberExpression(
		estree.MemberExpression(estree.Identifier('stdlib'), estree.Identifier('Math')),
		estree.Identifier('imul')
	*/
	exprTree = estree.Identifier(path[0]);
	for (i = 1; i < path.length; i++) {
		exprTree = estree.MemberExpression(exprTree, estree.Identifier(path[i]));
	}

	this.variableDeclarations.push(
		estree.VariableDeclarator(estree.Identifier(name), exprTree)
	);
    this.importedNames[name] = true;

    return variable;
};

exports.Context = Context;

function FunctionContext(parentContext, returnType) {
	var context = new Context(parentContext);
	context.returnType = returnType;
	return context;
}

exports.FunctionContext = FunctionContext;
