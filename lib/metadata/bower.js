/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('boot/lib/path');

module.exports = {
	libFolder: 'bower_components',
	locateMetaFile: locateBowerMetaFile,
	locateMetaFolder: locateBowerMetaFolder,
	createDescriptor: createBowerPackageDescriptor
};

function locateBowerMetaFile (options, pkgName) {
	return path.joinPaths(
		locateBowerMetaFolder(options, pkgName),
		options.metaName
	);
}

function locateBowerMetaFolder (options, pkgName) {
	return path.joinPaths(
		options.rootPath,
		options.libFolder,
		pkgName || ''
	);
}

function createBowerPackageDescriptor (options, url, meta) {
	var parts, descr;
	parts = path.splitDirAndFile(url);
	descr = {
		name: meta.name,
		version: meta.version,
		location: parts[0],
		metaType: 'bower',
		moduleType: meta.moduleType || 'amd',
		main: meta.main,
		metadata: meta
	};
	descr.uid = options.createUid(descr);
	return descr;
}
