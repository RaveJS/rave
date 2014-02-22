/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = globalFactory;

var globalEval = new Function('return eval(arguments[0]);');

function globalFactory (loader, load) {
	return function () {
		return globalEval(load.source);
	};
}
