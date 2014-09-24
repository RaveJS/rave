/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var findRequires = require('../lib/find/requires');

module.exports = instantiateNode;

function instantiateNode (nodeFactory) {
	return function (load) {
		var loader, deps, factory;

		loader = load.metadata.rave.loader;
		deps = findOrThrow(load);

		factory = nodeFactory(loader, load);

		return {
			deps: deps,
			execute: function () {
				return new Module(factory.apply(this, arguments));
			}
		};
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

