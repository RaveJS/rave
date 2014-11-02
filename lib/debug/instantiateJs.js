/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var moduleType = require('./moduleType');

module.exports = instantiateJs;

function instantiateJs (instantiator) {
	return function (load) {
		var instantiate = instantiator(moduleType(load));
		if (!instantiate) {
			throw new Error('No instantiator found for ' + load.name);
		}
		return instantiate(load);
	};
}
