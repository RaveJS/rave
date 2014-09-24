/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = instantiateScript;

var metadata = require('../lib/metadata');
var path = require('../lib/path');

function instantiateScript (scriptFactory) {
	return function (load) {
		var packages, pkg, deps;

		// find dependencies
		packages = load.metadata.rave.packages;
		pkg = metadata.findPackage(packages, load.name);
		if (pkg && pkg.deps) {
			deps = pkgMains(packages, pkg.deps)
		}

		var factory = scriptFactory(this, load);
		return {
			deps: deps,
			execute: function () {
				factory();
				return new Module({});
			}
		};
	}
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
