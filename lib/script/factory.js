/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = scriptFactory;

function scriptFactory (scriptEval) {
	return function (loader, load) {
		return create(scriptEval, load.source);
	};
}

function create (scriptEval, source) {
	return function () { scriptEval(source); };
}
