/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var npmCrawl = require('./crawl/npm').crawl;
var npmConvert = require('./convert/npm').convert;
var bowerCrawl = require('./crawl/bower').crawl;
var bowerConvert = require('./convert/bower').convert;
var path = require('./path');

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
		.then(collapseMetadata);
}

function crawlOne (rootUrl) {
	var fileParts, info;

	fileParts = path.splitDirAndFile(rootUrl);
	info = fileTypeInfo[fileParts[1]];

	return info
		? info.crawl(info.convert, fileParts[0])['catch'](logError)
		: Promise.reject(new Error('Unknown metadata file: ' + rootUrl));
}

function collapseMetadata (tuples) {
	return tuples.reduce(function (result, tuple) {
		if (!tuple || !tuple.root) return result;
		result.roots.push(tuple.root);
		tuple.all.reduce(function (packages, data) {
			packages[data.name] = packages[data.uid] = data;
			return packages;
		}, result.packages);
		return result;
	}, { roots: [], packages: {} });
}

function logError (ex) {
	console.error(ex);
}
