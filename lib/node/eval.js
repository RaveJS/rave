/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = nodeEval;

function nodeEval (global, require, exports, module, source) {
	// Note: V8 intermittently fails if we embed eval() in new Function()
	// and source has "use strict" in it
	new Function ('require', 'exports', 'module', 'global', source)
		.call(exports, require, exports, module, global, source);
}
