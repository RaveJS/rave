/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var metadata = require('../metadata');
var findEs5ModuleTypes = require('../find/es5ModuleTypes');

module.exports = moduleType;

function moduleType (load) {
	var pkg, type;

	pkg = metadata.findPackage(load.metadata.rave.packages, load.name);
	type = metadata.moduleType(pkg);

	if (type) {
		return type;
	}
	else {
		pkg.moduleType = guessModuleType(load) || ['globals']; // fix package
		return metadata.moduleType(pkg); // try again :)
	}
}

function guessModuleType (load) {
	try {
		var evidence = findEs5ModuleTypes(load.source, true);
		return evidence.isAmd && ['amd']
			|| evidence.isCjs && ['node'];
	}
	catch (ex) {
		ex.message += ' ' + load.name + ' ' + load.address;
		throw ex;
	}
}
