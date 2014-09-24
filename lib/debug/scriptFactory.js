/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var factory = require('../script/factory');
var addSourceUrl = require('../addSourceUrl');

module.exports = scriptFactory;

function scriptFactory (scriptEval) {
	return function (loader, load) {
		var address = load.address;
		return factory(debugEval)(loader, load);
		function debugEval (source) {
			var debugSrc = addSourceUrl(address, source);
			scriptEval(debugSrc);
		}
	};
}
