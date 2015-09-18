importScripts('mandelbrot-asm-js.js');

var mandel = Module();

onmessage = function(e) {
	var result = mandel.calc(e.data[0], e.data[1]);
	postMessage([e.data[2], e.data[3], result]);
};
