/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var beget = require('../beget');

module.exports = {
	processMetaFile: processMetaFile,
	processDependencies: processDependencies,
	saveDescriptor: saveDescriptor
};

function processMetaFile (context, options, pkgName) {
	var url;

	options = beget(options);

	// TODO: consider resolving this before this function executes
	if (pkgName) {
		url = options.locateMetaFile(options, pkgName);
		options.localRootPath = options.locateMetaFolder(options, pkgName);
	}
	else {
		url = options.rootUrl;
		options.localRootPath = options.rootPath;
	}

	return context.loader.import(url)
		.then(function (metadata) {
			// save this package's descriptor
			var pkgDesc = saveDescriptor(context, options, url, metadata);
			return processDependencies(context, options, metadata)
				.then(function (metadeps) {
					addDeps(pkgDesc, metadeps);
					return pkgDesc;
				});
		});

	function addDeps (descr, deps) {
		var uid;
		if (!descr.deps) descr.deps = {};
		for (var i = 0; i < deps.length; i++) {
			uid = options.createUid(deps[i]);
			descr.deps[deps[i].name] = uid;
		}
	}
}

function processDependencies (context, options, metadata) {
	var deps = metadata.dependencies, promises = [];
	for (var name in deps) {
		promises.push(processMetaFile(context, options, name));
	}
	return Promise.all(promises);
}

function saveDescriptor (context, options, url, metadata) {
	var uid, descr;

	descr = options.createDescriptor(options, url, metadata);
	uid = options.createUid(descr);

	if (!context.packages[uid]) context.packages[uid] = descr;
	if (!context.packages[descr.name]) context.packages[descr.name] = descr;

	return context.packages[uid];
}
