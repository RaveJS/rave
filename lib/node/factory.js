/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var es5Transform = require('../es5Transform');
var createRequire = require('../createRequire');

module.exports = nodeFactory;

function nodeFactory (nodeEval) {
	return function (loader, load) {
		var name, source, exports, module, require;

		name = load.name;
		source = load.source;
		exports = {};
		module = { id: name, uri: load.address, exports: exports };
		require = createRequire(loader, name);

		return function () {
			nodeEval(global, require, exports, module, source);
			// figure out what author intended to export
			return exports === module.exports
				? exports // a set of named exports
				: es5Transform.toLoader(module.exports); // a single default export
		};
	};
}
