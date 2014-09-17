/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var globalEval = require('./script/eval');

module.exports = globalFactory;

function globalFactory (loader, load) {
	return function () {
		globalEval(load.source);
	};
}
