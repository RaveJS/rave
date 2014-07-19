/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/find/requires');
var captureAmdArgs = require('../lib/captureAmdArgs');
var amdFactory = require('../lib/amdFactory');
var addSourceUrl = require('../lib/addSourceUrl');
var es5Transform = require('../lib/es5Transform');
var es5SideRegistry = require('../lib/es5SideRegistry');
var createRequire = require('../lib/createRequire');

module.exports = instantiateAmd;

var scopedVars = ['require', 'exports', 'module'];

function instantiateAmd (load) {
	var loader, defineArgs, arity, cjsRequire, factory, deps, depsMap, i;

	loader = load.metadata.rave.loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	// the safest way to capture the many define() variations is to run it
	defineArgs = captureOrThrow(load);
	arity = defineArgs.factory.length;

	// copy deps so we can remove items below!
	deps = defineArgs.depsList ? defineArgs.depsList.slice() : [];
	depsMap = {};

	if (defineArgs.depsList == null && arity > 0) {
		// is using load.source faster than defineArgs.factory.toString()?
		defineArgs.requires = findOrThrow(load);
		defineArgs.depsList = scopedVars.slice(0, arity);
		defineArgs.isCjs = arity > 1;
		deps = deps.concat(defineArgs.requires);
	}
	else {
		// check if module requires `module` or `exports`
		defineArgs.isCjs = hasCommonJSDep(deps);
	}

	cjsRequire = createRequire(getSync, getAsync);

	factory = amdFactory(cjsRequire, defineArgs, load);

	es5SideRegistry.set(load.name, execute);

	// remove "require", "exports", "module" from loader deps
	for (i = deps.length - 1; i >= 0; i--) {
		if (scopedVars.indexOf(deps[i]) >= 0) {
			deps.splice(i, 1);
		}
	}

	// normalize deps (async) and save in depMap so getSync can run sync
	return Promise.all(deps.map(normalizeDep))
		.then(function () {
			return {
				deps: deps,
				execute: function () {
					var value = es5SideRegistry.get(load.name);
					// remove from registry
					es5SideRegistry.remove(load.name);
					return value;
				}
			};
		});

	function execute () {
		return loader.newModule(factory());
	}

	function normalizeDep (dep) {
		return Promise.resolve(loader.normalize(dep, load.name, load.address))
			.then(function (normalized) {
				depsMap[dep] = normalized;
			});
	}

	function getSync (id) {
		var abs, value;
		abs = depsMap[id];
		value = es5SideRegistry.has(abs)
			? es5SideRegistry.get(abs)
			: loader.get(abs);
		return es5Transform.fromLoader(value);
	}

	function getAsync (id) {
		return loader
			.import(id, load.name)
			.then(es5Transform.fromLoader);
	}
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

function findOrThrow (load) {
	try {
		return findRequires(load.source);
	}
	catch (ex) {
		ex.message += ' ' + load.name + ' ' + load.address;
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
