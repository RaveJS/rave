/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = amdFactory;

function amdFactory (loader, defineArgs, load) {
	var module, scopedVars;

	module = {
		exports: {},
		id: load.name,
		uri: load.address
	};
	scopedVars = {
		require: get,
		module: module,
		exports: module.exports
	};

	return function () {
		var args, len, result;

		args = [];
		len = defineArgs.depsList ? defineArgs.depsList.length : 0;
		for (var i = 0; i < len; i++) {
			args.push(get(defineArgs.depsList[i]));
		}

		result = defineArgs.factory.apply(null, args);

		if (defineArgs.requires && typeof result === 'undefined') {
			result = module.exports;
		}

		// TODO: reuse this with nodeFactory:
		if (typeof result !== 'object') {
			result = {
				// for real ES6 modules to consume this module
				'default': result,
				// for es5 modules
				'__es5Module': result
			};
		}

		return result;
	};

	function get (id, callback, errback) {
		if (id in scopedVars) return scopedVars[id];

		id = loader.normalize(id, load.name);

		if (arguments.length > 1) {
			return loader.import(id).then(function (value) {
				return '__es5Module' in value ? value['__es5Module'] : value;
			}, errback);
		}
		else {
			var value = loader.get(id);
			return '__es5Module' in value ? value['__es5Module'] : value;
		}
	}
}
