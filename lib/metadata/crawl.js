/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var beget = require('../beget');
var createUid = require('../uid').create;

module.exports = {
	start: start,
	processMetaFile: processMetaFile,
	saveDescriptor: saveDescriptor
};

function start (context, crawler, rootUrl) {

	crawler.setRootUrl(rootUrl);

	return crawler.fetchMetaFile().then(
		function (metadata) {
			return processMetaFile(context, crawler, metadata);
		}
	);

}

function processMetaFile (context, crawler, metadata) {
	var pkgDesc, deps, promises, name;

	// save this package's descriptor
	pkgDesc = crawler.createDescriptor(metadata);
	pkgDesc = saveDescriptor(context, pkgDesc);
	pkgDesc.deps = {};

	deps = metadata.dependencies;
	promises = [];

	for (name in deps) (function (crawler) {
		crawler.setPackage(name);
		promises.push(crawler.fetchMetaFile()
			.then(function (metadata) {
				return processMetaFile(context, crawler, metadata)
			})
			.then(function (depDesc) {
				if (depDesc) {
					pkgDesc.deps[depDesc.name] = createUid(depDesc);
				}
			})
			['catch'](function () {
				// the package must exist at a higher level.
				return null;
			})
		);
	}(beget(crawler)));

	return Promise.all(promises).then(function () {
		return pkgDesc;
	});
}

function saveDescriptor (context, descr) {
	var uid, packages;

	uid = descr.uid;
	packages = context.packages;

	if (!packages[uid]) packages[uid] = descr;
	if (!packages[descr.name]) packages[descr.name] = descr;

	return descr;
}
