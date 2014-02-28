/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = nodeFactory;

var legacy = require('./legacy');

var nodeEval = new Function(
	'require', 'exports', 'module', 'global',
	'eval(arguments[4]);'
);

var _global;

_global = typeof global !== 'undefined' ? global : window;

function nodeFactory (loader, load) {
	var name, source, module, require, exec;

	name = load.name;
	source = load.source;
	module = { id: name, uri: load.address, exports: {} };
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
		var exports;
		nodeEval(require, module.exports, module, _global, source);
		exports = module.exports;
		return legacy.toLoader(exports);
	};
}
