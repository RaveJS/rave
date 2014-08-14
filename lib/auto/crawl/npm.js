/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var join = require('../../path').joinPaths;
var common = require('./common');

// main exports

exports.crawl = npmCrawl;

// exports for testing

exports.npmData = npmData;
exports.npmChildCrawler = npmChildCrawler;
exports.npmDependencies = npmDependencies;

var crawl = common.crawl;
var load = common.load;
var copy = common.copy;

function npmCrawl (convert, rootUrl) {
	var crawler = {
		all: [],
		load: npmLoad,
		rootUrl: rootUrl,
		getChildrenNames: npmDependencies,
		convert: convert
	};
	var data = npmData(null, rootUrl, '');

	crawler.childCrawler = npmChildCrawler(crawler, data);

	return crawl(crawler, data)
		.then(function (root) {
			return {
				root: root,
				all: crawler.all
			}
		});
}

function npmData (parent, rootUrl, name) {
	var fileType = 'package.json';
	return {
		name: name,
		parent: parent,
		pmType: 'npm',
		fileType: fileType,
		fileUrl: join(rootUrl, fileType),
		depFolder: join(rootUrl, 'node_modules'),
		rootUrl: rootUrl,
		location: rootUrl
	};
}

function npmChildCrawler (crawler, data) {
	return function (name) {
		var childRoot = join(data.depFolder, name);
		var childData = npmData(data, childRoot, name);
		return crawl(crawler, childData);
	};
}

function npmDependencies (data) {
	return Object.keys(data.metadata.dependencies || {})
		.concat(Object.keys(data.metadata.peerDependencies || {}));
}

function npmLoad (data) {
	return load(data)
		['catch'](function (ex) {
			console.log(ex);
			return npmTraverseUp(data);
		});
}

function npmTraverseUp (data) {
	var grandParent, grandRoot;
	// /client/node_modules/foo/node_modules/bar/package.json
	// /client/node_modules/bar/package.json

	grandParent = data.parent && data.parent.parent;

	if (!data.origFileUrl) data.origFileUrl = data.fileUrl;
	if (!grandParent) throw new Error('Did not find ' + data.origFileUrl);

	grandRoot = join(grandParent.depFolder, name);
	data = npmData(grandParent, grandRoot, data.name);

	return npmLoad(data);
}
