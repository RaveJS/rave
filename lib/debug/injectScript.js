/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = injectScript;

// This used to be a script injection routine, but indirect eval seems
// to work just as well in major browsers.
function injectScript (source) {
	(1, eval)(source);
}
