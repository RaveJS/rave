/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('boot/lib/path');

module.exports = {
	libFolder: 'node_modules',
	locateMetaFile: locateNpmMetaFile,
	locateMetaFolder: locateNpmMetaFolder,
	createDescriptor: createNpmPackageDescriptor
};

function locateNpmMetaFile (options, pkgName) {
	return path.joinPaths(
		locateNpmMetaFolder(options, pkgName),
		options.metaName
	);
}

function locateNpmMetaFolder (options, pkgName) {
	return path.joinPaths(
		options.localRootPath,
		options.libFolder,
		pkgName || ''
	);
}

function createNpmPackageDescriptor (options, url, meta) {
	var parts, descr;
	parts = path.splitDirAndFile(url);
	descr = {
		name: meta.name,
		version: meta.version,
		location: parts[0],
		metaType: 'npm',
		moduleType: meta.moduleType || 'node',
		main: meta.main,
		metadata: meta
	};
	descr.uid = options.createUid(descr);
	return descr;
}
