/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var parseUid = require('./uid').parse;
var path = require('./path');
var beget = require('./beget');

module.exports = {
	findPackage: findPackageDescriptor,
	findDepPackage: findDependentPackage
};

function findPackageDescriptor (descriptors, fromModule) {
	var parts, pkgName;
	parts = parseUid(fromModule);
	pkgName = parts.pkgUid || parts.pkgName;
	return descriptors[pkgName];
}

function findDependentPackage (descriptors, fromPkg, depName) {
	var parts, pkgName, depPkgUid;

	// ensure we have a package descriptor, not a uid
	if (typeof fromPkg === 'string') fromPkg = descriptors[fromPkg];

	parts = parseUid(depName);
	pkgName = parts.pkgUid || parts.pkgName;

	if (fromPkg && (pkgName === fromPkg.name || pkgName === fromPkg.uid)) {
		// this is the same the package
		return fromPkg;
	}
	else {
		// get dep pkg uid
		depPkgUid = fromPkg ? fromPkg.deps[pkgName] : pkgName;
		return depPkgUid && descriptors[depPkgUid];
	}
}
