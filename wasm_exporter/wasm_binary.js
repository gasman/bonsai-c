var leb = require('leb');

exports.writeVector = function(vec, out) {
	out.write(leb.encodeUInt32(vec.length));
	for (var i = 0; i < vec.length; i++) {
		vec[i].asBinary(out);
	}
};
