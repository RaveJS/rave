/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = scriptEval;

function scriptEval (source) {
	new Function(source)();
}
