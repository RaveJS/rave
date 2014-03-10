/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = amdFactory;

var legacy = require('./legacy');
var createRequire = require('./createRequire');

function amdFactory (loader, defineArgs, load) {
	var cjsRequire, require, exports, module, scopedVars;

	cjsRequire = createRequire(loader, load.name);
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

		if (typeof result === 'undefined' && defineArgs.isCjs) {
			return exports === module.exports
				? result // a set of named exports
				: legacy.toLoader(result); // a single default export
		}
		else {
			return legacy.toLoader(result);
		}
	};

	function amdRequire (id, callback, errback) {
		if (id in scopedVars) return scopedVars[id];

		if (arguments.length > 1) {
			return cjsRequire.async(id).then(callback, errback);
		}
		else {
			return cjsRequire(id);
		}
	}
}
