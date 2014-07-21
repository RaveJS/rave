/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/find/requires');
var nodeFactory = require('../lib/nodeFactory');
var addSourceUrl = require('../lib/addSourceUrl');
var es5Transform = require('../lib/es5Transform');
var es5SideRegistry = require('../lib/es5SideRegistry');
var createRequire = require('../lib/createRequire');

module.exports = instantiateNode;

function instantiateNode (load) {
	var loader, deps, depsMap, require, factory;

	loader = load.metadata.rave.loader;
	deps = findOrThrow(load);
	depsMap = {};

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	require = createRequire(getSync, getAsync);
	factory = nodeFactory(require, load);

	es5SideRegistry.set(load.name, execute);

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
			.import(id, { name: load.name })
			.then(es5Transform.fromLoader);
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

