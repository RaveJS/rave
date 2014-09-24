/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var factory = require('../script/factory');
var addSourceUrl = require('../addSourceUrl');

// re-export
module.exports = scriptFactory;

function scriptFactory (scriptEval) {
	return function (loader, load) {
		return factory(debugEval)(loader, load);
		function debugEval (global, define, source) {
			var debugSrc = addSourceUrl(load.address, source);
			return scriptEval(global, define, debugSrc);
		}
	};
}
