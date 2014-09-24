/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var addSourceUrl = require('../addSourceUrl');
var origCaptureDefines = require('../amd/captureDefines');

module.exports = captureDefines;

function captureDefines (amdEval) {
	return function (load) {
		return origCaptureDefines(_eval)(load);
		function _eval (global, define, source) {
			return amdEval(global, define, addSourceUrl(load.address, source));
		}
	};
}
