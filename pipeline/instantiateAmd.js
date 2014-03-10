/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/findRequires');
var captureAmdArgs = require('../lib/captureAmdArgs');
var amdFactory = require('../lib/amdFactory');
var addSourceUrl = require('../lib/addSourceUrl');

module.exports = instantiateAmd;

var scopedVars = ['require', 'exports', 'module'];

function instantiateAmd (load) {
	var loader, defineArgs, arity, factory, deps, isCjs, i;

	loader = load.metadata.rave.loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	// the safest way to capture the many define() variations is to run it
	defineArgs = captureOrThrow(load);
	arity = defineArgs.factory.length;

	deps = defineArgs.depsList || [];

	if (defineArgs.deps == null && arity > 0) {
		// is using load.source faster than defineArgs.factory.toString()?
		defineArgs.requires = findRequires(load.source);
		defineArgs.depsList = scopedVars.slice(0, arity);
		defineArgs.isCjs = true;
		deps = deps.concat(defineArgs.requires);
	}
	else {
		// check if module requires `module` or `exports`
		defineArgs.isCjs = hasCommonJSDep(deps);
	}

	factory = amdFactory(loader, defineArgs, load);

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
		return captureAmdArgs(load.source);
	}
	catch (ex) {
		ex.message = 'Error while capturing AMD define: '
			+ load.name + '. ' + ex.message;
		throw ex;
	}
}

function hasCommonJSDep (deps) {
	// check if module requires `module` or `exports`
	for (var i = deps.length - 1; i >= 0; i--) {
		if (deps[i] === 'exports' || deps[i] === 'module') return true;
	}
	return false;
}
