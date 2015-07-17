importScripts('module.js');

var module = Module();

onmessage = function(e) {
	var result = module.main();
	postMessage(result);
};
