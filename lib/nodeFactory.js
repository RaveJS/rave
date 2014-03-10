/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = nodeFactory;

var legacy = require('./legacy');
var createRequire = require('./createRequire');

var nodeEval = new Function(
	'require', 'exports', 'module', 'global',
	'eval(arguments[4]);'
);

var _global;

_global = typeof global !== 'undefined' ? global : window;

function nodeFactory (loader, load) {
	var name, source, exports, module, require;

	name = load.name;
	source = load.source;
	exports = {};
	module = { id: name, uri: load.address, exports: exports };
	require = createRequire(loader, name);

	return function () {
		// TODO: use loader.global when es6-module-loader implements it
		var exported;
		nodeEval(require, module.exports, module, _global, source);
		exported = module.exports;
		// figure out what author intended to export
		return exports === module.exports
			? exported // a set of named exports
			: legacy.toLoader(exported); // a single default export
	};
}
