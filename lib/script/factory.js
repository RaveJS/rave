/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var scriptEval = require('./eval');

module.exports = scriptFactory;

function scriptFactory (loader, load) {
	return function () {
		scriptEval(load.source);
	};
}
