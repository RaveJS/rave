/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = captureDefines;

function captureDefines (amdEval) {
	return function (load) {
		var result, isAnon, capture;

		result = { named: [] };

		capture = function captureDefine () {
			var args, def;

			args = copy(arguments);

			// last arg is always the factory (or a plain value)
			def = { factory: ensureFactory(args.pop()) };

			// if there are other args
			if (args.length > 0) {
				// get list of dependency module ids
				def.depsList = args.pop();
				// if this is a string, then there are no deps
				if (typeof def.depsList === 'string') {
					def.name = def.depsList;
					delete def.depsList;
				}
				else {
					def.name = args.pop() || null;
				}
				if (args.length > 0) {
					throw new Error('Unparsable AMD define arguments ['
						+ copy(arguments)
						+ '] found in ' + load.name
					);
				}
			}

			if (!def.name) {
				if (isAnon) {
					throw new Error('Multiple anon defines in' + load.name);
				}
				isAnon = true;
				result.anon = def;
			}
			else {
				result.named.push(def);
			}

		};

		// indicate we are AMD and we can handle the jqueries
		capture.amd = { jQuery: {} };

		amdEval(global, capture, load.source);

		if (!result) {
			throw new Error('AMD define not called in ' + load.name);
		}

		return result;
	};
}

function ensureFactory (thing) {
	return typeof thing === 'function'
		? thing
		: function () { return thing; }
}

var slice = Array.prototype.slice;

function copy (thing) {
	return slice.call(thing);
}
