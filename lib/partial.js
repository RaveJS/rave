/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = partial;

/**
 * Returns a function that has part of its parameters captured.
 * @param {Function} func
 * @param {Array} args
 * @returns {Function}
 */
function partial (func, args) {
	return function () {
		var copy = args.concat(args.slice.apply(arguments));
		return func.apply(this, copy);
	};
}
