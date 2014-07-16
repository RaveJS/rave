/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/find/requires');
var captureAmdDefines = require('../lib/captureAmdDefines');
var amdFactory = require('../lib/amdFactory');
var addSourceUrl = require('../lib/addSourceUrl');
var parseUid = require('../lib/uid').parse;

module.exports = instantiateAmd;

var scopedVars = ['require', 'exports', 'module'];

function instantiateAmd (load) {
	var loader, defines, mainDefine, arity, factory, deps, isCjs, i;

	loader = load.metadata.rave.loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	// the surest way to capture the many define() variations is to run it
	defines = captureOrThrow(load);
	mainDefine = defines.anon || defines.named.pop();

	// TODO: figure out which named define is the right one
	// TODO: do something with the remaining named defines

	arity = mainDefine.factory.length;

	// copy deps so we can remove items below!
	deps = defineArgs.depsList ? defineArgs.depsList.slice() : [];

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
		return captureAmdDefines(load.source);
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
