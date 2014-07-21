/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = amdFactory;

var es5Transform = require('./es5Transform');

function amdFactory (cjsRequire, defineArgs, load) {
	var require, exports, module, scopedVars;

	require = amdRequire;
	require.async = cjsRequire.async;
	require.named = cjsRequire.named;

	exports = {};
	module = {
		exports: exports,
		id: load.name,
		uri: load.address,
		config: function () {
			return load.metadata.rave;
		}
	};
	scopedVars = {
		require: require,
		module: module,
		exports: exports
	};

	return function () {
		var args, len, result;

		args = [];
		len = defineArgs.depsList ? defineArgs.depsList.length : 0;
		for (var i = 0; i < len; i++) {
			args.push(amdRequire(defineArgs.depsList[i]));
		}

		result = defineArgs.factory.apply(null, args);

		// AMD factory result trumps all. if it's undefined, we
		// may be using CommonJS syntax.
		if (typeof result !== 'undefined' || !defineArgs.isCjs) {
			return es5Transform.toLoader(result); // a single default export
		}
		else {
			return exports === module.exports
				? exports // a set of named exports
				: es5Transform.toLoader(module.exports); // a single default export
		}
	};

	function amdRequire (id, callback, errback) {

		return typeof id === 'string'
			? requireSync(id)
			: Promise.all(id.map(requireOne)).then(applyCallback, errback);

		function applyCallback (modules) {
			try {
				return callback.apply(null, modules);
			}
			catch (ex) {
				errback(ex);
			}
		}
	}

	function requireSync (id) {
		return id in scopedVars
			? scopedVars[id]
			: cjsRequire(id);
	}

	function requireOne (id) {
		return id in scopedVars
			? scopedVars[id]
			: cjsRequire.async(id);
	}
}
