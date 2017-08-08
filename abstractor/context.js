function Context(parentContext, returnType) {
	this.parentContext = parentContext;
	if (this.parentContext) {
		this.isGlobalContext = false;
		this.globalContext = this.parentContext.globalContext;
	} else {
		this.isGlobalContext = true;
		this.globalContext = this;
		this.nextHeapAddress = 0;
		this.nextId = 0;
	}
	this.returnType = returnType;
	this.variables = {};
}

Context.prototype.define = function(name, type) {
	var definition = {
		'name': name,
		'type': type,
		'id': this.globalContext.nextId++,
		'isGlobal': this.isGlobalContext
	};
	this.variables[name] = definition;
	return definition;
};
Context.prototype.get = function(name) {
	if (name in this.variables) {
		return this.variables[name];
	} else if (this.parentContext) {
		return this.parentContext.get(name);
	}
	return null;
};
Context.prototype.createChildContext = function() {
	return new Context(this, this.returnType);
};
Context.prototype.createFunctionContext = function(returnType) {
	return new Context(this, returnType);
};
Context.prototype.allocateFromHeap = function(size) {
	if (!this.isGlobalContext) {
		throw("Can only allocate heap storage from the global context");
	}
	var result = this.nextHeapAddress;
	this.nextHeapAddress += size;
	return result;
};

exports.Context = Context;
