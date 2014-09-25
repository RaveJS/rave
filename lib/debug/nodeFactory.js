/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var factory = require('../node/factory');
var addSourceUrl = require('../addSourceUrl');

module.exports = nodeFactory;

function nodeFactory (nodeEval) {
	return function (loader, load) {
		return factory(debugEval)(loader, load);
		function debugEval (global, require, exports, module, source) {
			return nodeEval(global, require, exports, module, source, debugTransform);
		}
		// We must add the source url from within nodeEval to work around
		// browser bugs that prevent scripts from showing in the debugger
		// if the sourceURL line is inside a wrapper function.
		function debugTransform (source) {
			return addSourceUrl(load.address, source);
		}
	};
}
