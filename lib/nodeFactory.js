/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = nodeFactory;

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
		return '__es5Module' in imports ? imports['__es5Module'] : imports;
	};

	return function () {
		// TODO: use loader.global when es6-module-loader implements it
		var g = global, exports;
		nodeEval(require, module.exports, module, g, source);
		exports = module.exports;
		if (typeof exports !== 'object') {
			exports = {
				// for real ES6 modules to consume this module
				'default': exports,
				// for es5 modules
				'__es5Module': exports
			};
		}
		return exports;
	};
}
