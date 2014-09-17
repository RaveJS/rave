/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = amdEval;

function amdEval (global, define, source) {
	new Function('define', source).call(global, define);
}
