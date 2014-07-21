/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createRequire;

var es5Transform = require('./es5Transform');

function createRequire (syncGet, asyncGet) {

	// Implement proposed require.async, just like Montage Require:
	// https://github.com/montagejs/mr, but with an added `names`
	// parameter.
	require.async = function (id) {
		var names;
		names = arguments[1];
		return asyncGet(id).then(function (value) {
			return names ? getExports(names, value) : value;
		});
	};

	require.named = namedRequire;

	return require;

	function require (id) {
		return syncGet(id);
	}

	function namedRequire (id, names) {
		return names
			? getExports(names, syncGet(id))
			: require(id);
	}
}

function getExports (names, value) {
	var exports, i;
	exports = {};
	for (i = 0; i < names.length; i++) {
		exports[names[i]] = value[names[i]];
	}
	return exports;
}
