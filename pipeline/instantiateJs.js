/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var metadata = require('../lib/metadata');
var moduleType = metadata.moduleType;

module.exports = instantiateJs;

function instantiateJs (instantiator) {
	return function (load) {
		var pkg = metadata.findPackage(load.metadata.rave.packages, load.name);
		return instantiator(moduleType(pkg) || 'globals')(load);
	};
}
