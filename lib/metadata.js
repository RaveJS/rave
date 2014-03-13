/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('./path');
var beget = require('./beget');

var crawl = require('./metadata/crawl');
var bowerCrawler = require('./metadata/bower');
var npmCrawler = require('./metadata/npm');

var metaNameToCrawler = {
	'bower.json': bowerCrawler,
	'package.json': npmCrawler
};

module.exports = {
	crawl: crawlStart,
	findPackage: findPackageDescriptor,
	findDepPackage: findDependentPackage,
	createUid: createUid,
	parseUid: parseUid
};

function crawlStart (context, rootUrl) {
	var parts, metaName, crawler;

	parts = path.splitDirAndFile(rootUrl);
	metaName = parts[1];
	crawler = metaNameToCrawler[metaName];

	if (!crawler) throw new Error('Unknown metadata file: ' + rootUrl);

	crawler.createUid = createUid;

	return crawl.start(context, crawler, rootUrl);
}

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

function createUid (descriptor, normalized) {
	return /*descriptor.metaType + ':' +*/ descriptor.name
		+ (descriptor.version ? '@' + descriptor.version : '')
		+ (normalized ? '#' + normalized : '');
}

function parseUid (uid) {
	var uparts = uid.split('#');
	var name = uparts.pop();
	var nparts = name.split('/');
	return {
		name: name,
		pkgName: nparts.shift(),
		modulePath: nparts.join('/'),
		pkgUid: uparts[0]
	}
}
