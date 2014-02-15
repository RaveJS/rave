/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('boot/lib/path');
var beget = require('./beget');

var crawl = require('./metadata/crawl');
var bowerOptions = require('./metadata/bower');
var npmOptions = require('./metadata/npm');

var metaNameToOptions = {
	'bower.json': bowerOptions,
	'package.json': npmOptions
};

module.exports = {
	crawl: crawlStart,
	findPackage: findPackageDescriptor,
	findDepPackage: findDependentPackage,
	createUid: createUid
};

function crawlStart (context, rootUrl) {
	var parts, metaName, metaOptions, options;

	parts = path.splitDirAndFile(rootUrl);
	metaName = parts[1];
	metaOptions = metaNameToOptions[metaName];

	if (!metaOptions) throw new Error('Unknown metadata file: ' + rootUrl);

	options = beget(metaOptions);

	options.metaName = metaName;
	options.rootPath = parts[0];
	options.rootUrl = rootUrl;
	options.createUid = createUid;

	return crawl.processMetaFile(context, options, '');
}

function findPackageDescriptor (descriptors, fromModule) {
	var parts, pkgName;
	// obtain the package name
	parts = fromModule.split('#');
	if (parts.length > 1) {
		pkgName = parts[0];
	}
	else {
		pkgName = fromModule.split('/')[0];
	}
	return descriptors[pkgName];
}

function findDependentPackage (descriptors, fromPkg, depName) {
	var parts, pkgName, depPkgUid;

	// ensure we have a package descriptor, not a uid
	if (typeof fromPkg === 'string') fromPkg = descriptors[fromPkg];

	// obtain the package name
	parts = depName.split('#');
	if (parts.length > 1) {
		pkgName = parts[0];
	}
	else {
		pkgName = depName.split('/')[0];
	}

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

function createUid (descriptor, normalized) {
	return /*descriptor.metaType + ':' +*/ descriptor.name
		+ (descriptor.version ? '@' + descriptor.version : '')
		+ (normalized ? '#' + normalized : '');
}
