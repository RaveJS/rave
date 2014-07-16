/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = instantiateScript;

var globalFactory = require('../lib/globalFactory');
var addSourceUrl = require('../lib/addSourceUrl');
var metadata = require('../lib/metadata');
var path = require('../lib/path');

function instantiateScript (load) {
	var packages, pkg, deps, factory, loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	// find dependencies
	packages = load.metadata.rave.packages;
	pkg = metadata.findPackage(packages, load.name);
	if (pkg && pkg.deps) {
		deps = pkgMains(packages, pkg.deps)
	}

	factory = globalFactory(this, load);
	loader = load.metadata.rave.loader;

	return {
		deps: deps,
		execute: function () {
			factory();
			return loader.newModule({});
		}
	};

}


function pkgMains (packages, depPkgs) {
	var main, mains = [];
	for (var name in depPkgs) {
		// package-to-package dependency
		main = packages[depPkgs[name]].name;
		if (main) {
			mains.push(main);
		}
	}
	return mains;
}
