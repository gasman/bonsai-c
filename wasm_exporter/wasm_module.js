class WasmModule {
	asText() {
		var output = "(module\n";
		output += ")";

		return output;
	}

	static fromAbstractModule(abstractModule) {
		return new WasmModule();
	}
}
exports.WasmModule = WasmModule;
