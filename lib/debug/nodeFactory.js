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
			var debugSrc = addSourceUrl(load.address, source);
			return nodeEval(global, require, exports, module, debugSrc);
		}
	};
}
