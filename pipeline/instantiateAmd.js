/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/find/requires');
var captureDefines = require('../lib/amd/captureDefines');
var amdFactory = require('../lib/amd/factory');
var addSourceUrl = require('../lib/addSourceUrl');
var processBundle = require('../lib/amd/bundle').process;

module.exports = instantiateAmd;

var scopedVars = ['require', 'exports', 'module'];

function instantiateAmd (load) {
	var loader, defines, mainDefine, arity, factory, deps, i;

	loader = load.metadata.rave.loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	// the surest way to capture the many define() variations is to run it
	defines = captureOrThrow(load);

	if (defines.named.length <= 1) {
		mainDefine = defines.anon || defines.named.pop()
	}
	else {
		mainDefine = processBundle(load, defines.named);
	}

	arity = mainDefine.factory.length;

	// copy deps so we can remove items below!
	deps = mainDefine.depsList ? mainDefine.depsList.slice() : [];

	if (mainDefine.depsList == null && arity > 0) {
		mainDefine.requires = findOrThrow(load, mainDefine.factory.toString());
		mainDefine.depsList = scopedVars.slice(0, arity);
		deps = deps.concat(mainDefine.requires);
	}

	factory = amdFactory(loader, mainDefine, load);

	// remove "require", "exports", "module" from loader deps
	for (i = deps.length - 1; i >= 0; i--) {
		if (scopedVars.indexOf(deps[i]) >= 0) {
			deps.splice(i, 1);
		}
	}

	return {
		deps: deps,
		execute: function () {
			return new Module(factory.apply(loader, arguments));
		}
	};
}

function captureOrThrow (load) {
	try {
		return captureDefines(load.source);
	}
	catch (ex) {
		ex.message = 'Error while parsing AMD: '
			+ load.name + '. ' + ex.message;
		throw ex;
	}
}

function findOrThrow (load, source) {
	try {
		return findRequires(source);
	}
	catch (ex) {
		ex.message += ' ' + load.name + ' ' + load.address;
		throw ex;
	}
}
