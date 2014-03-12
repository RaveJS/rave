/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('../path');

module.exports = {
	libFolder: 'bower_components',
	locateMetaFile: locateBowerMetaFile,
	locateMetaFolder: locateBowerMetaFolder,
	createDescriptor: createBowerPackageDescriptor,
	findJsMain: findJsMain,
	findModuleType: findModuleType
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
	var parts, moduleType, main, descr;
	parts = path.splitDirAndFile(url);
	moduleType = findModuleType(meta);
	main = meta.main && findJsMain(meta.main);
	if (main && moduleType !== 'script') main = path.removeExt(main);
	descr = {
		name: meta.name,
		version: meta.version,
		location: parts[0],
		metaType: 'bower',
		moduleType: moduleType,
		main: main,
		metadata: meta
	};
	descr.uid = options.createUid(descr);
	return descr;
}

function findJsMain (mains) {
	if (typeof mains === 'string') return mains;
	for (var i = 0; i < mains.length; i++) {
		if (mains[i].slice(-2) === 'js') return mains[i];
	}
}

// TODO: remove matches on 'cujo' <-- HACK!
var findAmdRx = /\bamd\b|\bcujo\b/i;

function findModuleType (meta) {
	if (meta.moduleType in { amd: 1, umd: 1 }) return 'amd';
	if (meta.moduleType in { global: 1, script: 1 }) return 'script';
	if ('moduleType' in meta) return meta.moduleType;
	return (meta.name && findAmdRx.test(meta.name))
		|| (meta.description && findAmdRx.test(meta.description))
		|| (meta.keywords && (meta.keywords.indexOf('amd') >= 0 || meta.keywords.indexOf('cujo') >= 0))
		? 'amd'
		: 'script';
}
