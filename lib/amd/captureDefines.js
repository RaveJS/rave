/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = captureDefines;

function captureDefines (amdEval) {
	var result;

	define.amd = { jQuery: {} };

	return function (load) {
		result = { named: [], isAnon: false, anon: void 0, called: false };
		return capture(amdEval, define, load, result);
	};

	function define () {
		return _define(result, arguments);
	}
}

function capture (amdEval, define, load, result) {
	try {
		amdEval(global, define, load.source);
	}
	catch (ex) {
		ex.message += ' in ' + load.name;
		throw ex;
	}
	if (!result.called) {
		throw new Error('AMD define not called in ' + load.name);
	}
	return result;
}

function _define (result, args) {
	var len, def, arg, undef;

	len = args.length;

	result.called = true;

	// last arg is always the factory (or a plain value)
	def = {
		factory: ensureFactory(args[--len]),
		depsList: undef,
		name: undef
	};

	// if there are more args
	if (len) {
		// get second-to-last arg
		arg = args[--len];
		if (typeof arg === 'string') {
			def.name = arg;
		}
		else {
			def.depsList = arg;
		}
	}

	// if there are at least one more args and it's a string
	if (len && typeof args[--len] === 'string') {
		def.name = args[len];
	}

	// if we didn't consume exactly the right number of args
	if (len !== 0) {
		throw new Error('Unparsable AMD define arguments ['
			+ Array.prototype.slice.call(args) +
			']'
		);
	}

	if (!def.name) {
		if (result.isAnon) {
			throw new Error('Multiple anon defines');
		}
		result.isAnon = true;
		result.anon = def;
	}
	else {
		result.named.push(def);
	}
}

function ensureFactory (thing) {
	return typeof thing === 'function'
		? thing
		: function () { return thing; }
}
