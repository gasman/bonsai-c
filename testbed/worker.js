importScripts('module.js');

var module = Module(self);

onmessage = function(e) {
	var result = module.main();
	postMessage(result);
};
