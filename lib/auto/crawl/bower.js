/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var join = require('../../path').joinPaths;
var common = require('./common');

// main exports

exports.crawl = bowerCrawl;

// exports for testing

exports.load = bowerLoad;
exports.data = bowerData;
exports.childCrawler = bowerChildCrawler;
exports.dependencies = bowerDependencies;

var crawl = common.crawl;
var load = common.load;

function bowerCrawl (convert, rootUrl) {
	var crawler = {
		all: [],
		rootUrl: rootUrl,
		depFolder: join(rootUrl, 'bower_components'),
		load: bowerLoad,
		getChildrenNames: bowerDependencies,
		convert: convert
	};
	var data = bowerData(rootUrl, '');

	crawler.childCrawler = bowerChildCrawler(crawler, data);

	return crawl(crawler, data)
		.then(function (root) {
			return {
				root: root,
				all: crawler.all
			}
		});
}

function bowerLoad (data) {
	return load(data)
		['catch'](switchToPackageJson)
		['catch'](provideBlankData);

	function switchToPackageJson () {
		var fileType = data.fileType = 'package.json';
		data.fileUrl = join(data.rootUrl, fileType);
		return load(data);
	}

	function provideBlankData () {
		data.fileType = '';
		data.metadata = null;
		return data;
	}
}

function bowerData (rootUrl, name) {
	var fileType = 'bower.json';
	return {
		name: name,
		pmType: 'bower',
		fileType: fileType,
		fileUrl: join(rootUrl, fileType),
		depFolder: join(rootUrl, 'bower_components'),
		rootUrl: rootUrl,
		location: rootUrl
	};
}

function bowerChildCrawler (crawler, data) {
	return function (name) {
		var childRoot = join(crawler.depFolder, name);
		var childData = bowerData(childRoot, name);
		return crawl(crawler, childData);
	};
}

function bowerDependencies (data) {
	return data.fileType === 'bower.json'
		? Object.keys(data.metadata.dependencies || {})
		: [];
}

