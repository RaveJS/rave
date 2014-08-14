/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var npmCrawl = require('./crawl/npm').crawl;
var npmConvert = require('./convert/npm').convert;
var bowerCrawl = require('./crawl/bower').crawl;
var bowerConvert = require('./convert/bower').convert;
var path = require('../path');

module.exports = crawl;

var fileTypeInfo = {
	'bower.json': {
		crawl: bowerCrawl,
		convert: bowerConvert
	},
	'package.json': {
		crawl: npmCrawl,
		convert: npmConvert
	}
};

function crawl (rootUrls) {
	if (typeof rootUrls === 'string') {
		rootUrls = rootUrls.split(/\s*,\s*/);
	}
	return Promise.all(rootUrls.map(crawlOne))
		.then(function (tuples) {
			// TODO: do something useful with { root, all } tuples or stop returning tuples
			return collapseMetadata(tuples);
		});
}

function crawlOne (rootUrl) {
	var fileParts, info;

	fileParts = path.splitDirAndFile(rootUrl);
	info = fileTypeInfo[fileParts[1]];

	if (!info) throw new Error('Unknown metadata file: ' + rootUrl);

	return info.crawl(info.convert, fileParts[0]);
}

function collapseMetadata (tuples) {
	return tuples.reduce(function (result, tuple) {
		if (!tuple.root) return;
		result.roots.push(tuple.root);
		tuple.all.reduce(function (packages, data) {
			packages[data.name] = packages[data.uid] = data;
			return packages;
		}, result.packages);
		return result;
	}, { roots: [], packages: {} });
}

// ----

function applyOverrides (data) {
	// should overrides from a package apply to any other package?
	// ... or to just direct dependencies?
	// ... or to any ancestor (dependency of a dependency)?
}
