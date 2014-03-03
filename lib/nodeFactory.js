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
	var name, source, module, require;

	name = load.name;
	source = load.source;
	module = { id: name, uri: load.address, exports: {} };
	require = createRequire(loader, name);

	return function () {
		// TODO: use loader.global when es6-module-loader implements it
		var exports;
		nodeEval(require, module.exports, module, _global, source);
		exports = module.exports;
		return legacy.toLoader(exports);
	};
}
