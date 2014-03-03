/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createRequire;

var legacy = require('./legacy');

function createRequire (loader, refId) {

	var require = function (id) { return syncRequire(id); };

	// Implement proposed require.async, just like Montage Require:
	// https://github.com/montagejs/mr, but with an added `names`
	// parameter.
	require.async = function (id) {
		var abs, args;
		abs = loader.normalize(id, refId);
		args = arguments;
		return loader.import(abs).then(function (value) {
			return args.length > 1
				? getNamedExports(args[1], value)
				: legacy.fromLoader(value);
		});
	};

	require.named = syncRequire;

	return require;

	function syncRequire (id, names) {
		var abs, value;
		abs = loader.normalize(id, refId);
		value = loader.get(abs);
		return arguments.length > 1
			? getNamedExports(names, value)
			: legacy.fromLoader(value);
	}
}

function getNamedExports (names, obj) {
	var exports = {};
	// if names is omitted, return all exportable values
	if (typeof names === 'undefined') names = obj;
	for (var key in names) {
		exports[key] = obj[key];
	}
	return exports;
}
