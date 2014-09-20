/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var metadata = require('../lib/metadata');
var instantiateNode = require('./instantiateNode');
var instantiateAmd = require('./instantiateAmd');
var instantiateScript = require('./instantiateScript');
var findEs5ModuleTypes = require('../lib/find/es5ModuleTypes');

module.exports = instantiateJs;

function instantiateJs (load) {
	var pkg, moduleType;

	pkg = metadata.findPackage(load.metadata.rave.packages, load.name);
	moduleType = pkg.moduleType;

	// prefer amd-formatted modules since they use less string manip
	if (hasModuleType(moduleType, 'amd')) {
		return instantiateAmd(load);
	}
	else if (hasModuleType(moduleType, 'node')) {
		return instantiateNode(load);
	}
	else if (hasModuleType(moduleType, 'globals')) {
		return instantiateScript(load);
	}
	else {
		moduleType = guessModuleType(load);
		pkg.moduleType = moduleType || ['globals']; // fix package
		return instantiateJs(load); // try again :)
	}
}

function hasModuleType (moduleType, type) {
	return moduleType && moduleType.indexOf(type) >= 0;
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
