/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = captureDefines;

function captureDefines (source) {
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
				throw new Error('Unparsable AMD define arguments: ', copy(arguments));
			}
		}

		if (!def.name) {
			if (isAnon) throw new Error('Multiple anonymous defines.');
			isAnon = true;
			result.anon = def;
		}
		else {
			result.named.push(def);
		}

	};

	// indicate we are AMD and we can handle the jqueries
	capture.amd = { jQuery: {} };

	// Note: V8 intermittently fails if we embed eval() in new Function()
	// and source has "use strict" in it
	new Function('define', source).call(global, capture);

	if (!result) {
		throw new Error('AMD define not called.');
	}

	return result;
}

function ensureFactory (thing) {
	return typeof thing === 'function'
		? thing
		: function () { return thing; }
}

function copy (thing) {
	return Array.prototype.slice.call(thing);
}
