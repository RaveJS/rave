/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var metadata = require('../metadata');
var createUid = require('../uid').create;
var amdFactory = require('./factory');

exports.process = process;

// TODO: replace this sync algorithm with one that is based on register()
// if (defines.named.length <= 1) process as before
// else loop through defines and eval all modules sync,
//   returning the one whose name matches load.name

// TODO: register-based algorithm
//if (defines.anon) register(defines.anon, load.name);
//defines.named.forEach(function (def) {
// register(def);
//});

function process (load, defines) {
	var mainDefine, i;

	for (i = 0; i < defines.length; i++) {
		mainDefine = processOne(load, defines[i]) || mainDefine;
	}

	return mainDefine;

}

function processOne (load, define) {
	var loader, packages, name, uid, defLoad, value;

	loader = load.metadata.rave.loader;
	packages = load.metadata.rave.packages;
	name = define.name;
	uid = getUid(packages, name);

	if (uid === load.name) {
		return define;
	}
	else {
		defLoad = Object.create(load);
		defLoad.name = uid;
		defLoad.address = load.address + '#' + encodeURIComponent(name);
		value = amdFactory(loader, define, defLoad)();
		loader.set(uid, new Module(value));
	}
}

function getUid (packages, name) {
	var pkg = metadata.findPackage(packages, name);
	return createUid(pkg, name);
}
