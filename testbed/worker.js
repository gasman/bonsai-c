importScripts('module.js');

var heap = new ArrayBuffer(0x10000);
var module = Module(self, null, heap);

onmessage = function(e) {
	var result = module.main();
	postMessage(result);
};
