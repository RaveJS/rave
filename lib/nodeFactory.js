/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = nodeFactory;

var legacy = require('./legacy');

var nodeEval = new Function(
	'require', 'exports', 'module', 'global',
	'eval(arguments[4]);'
);

var global;

if (typeof global === 'undefined') {
	global = window;
}

function nodeFactory (loader, load) {
	var source, module, require;

	source = load.source;
	module = { id: load.name, uri: load.address, exports: {} };
	require = function (id) {
		var abs, imports;
		abs = loader.normalize(id, module.id);
		imports = loader.get(abs);
		return legacy.fromLoader(imports);
	};

	// Implement CommonJS 2.0 async, just like Montage Require:
	// https://github.com/montagejs/mr
	require.async = function (id) {
		id = loader.normalize(id, load.name);
		return loader.import(id).then(function (value) {
			return legacy.fromLoader(value);
		});
	};


	return function () {
		// TODO: use loader.global when es6-module-loader implements it
		var g = global, exports;
		nodeEval(require, module.exports, module, g, source);
		exports = module.exports;
		return legacy.toLoader(exports);
	};
}
