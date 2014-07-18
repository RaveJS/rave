/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/find/requires');
var nodeFactory = require('../lib/nodeFactory');
var addSourceUrl = require('../lib/addSourceUrl');
var es5Transform = require('../lib/es5Transform');
var createRequire = require('../lib/createRequire');

module.exports = instantiateNode;

function instantiateNode (load) {
	var loader, deps, depMap, require, factory;

	loader = load.metadata.rave.loader;
	deps = findOrThrow(load);

	depMap = {};

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	require = createRequire(getSync, getAsync);
	factory = nodeFactory(require, load);

	return {
		deps: deps,
		execute: function () {
			return loader.newModule(factory.apply(this, arguments));
		}
	};

	function getSync (id) {
		var abs;
		// build depMap as needed
		abs = depMap[id];
		if (abs == null) {
			abs = depMap[id] = loader.normalize(id, load.name);
		}
		return es5Transform.fromLoader(loader.get(abs));
	}

	function getAsync (id) {
		return loader
			.import(id, load.name)
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

