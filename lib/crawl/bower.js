/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var join = require('../path').joinPaths;
var common = require('./common');

// main exports

exports.crawl = bowerCrawl;

// exports for testing

exports.bowerLoad = bowerLoad;
exports.bowerContext = bowerContext;
exports.bowerSetState = bowerSetState;
exports.bowerChildCrawler = bowerChildCrawler;
exports.bowerDependencies = bowerDependencies;

var crawl = common.crawl;
var load = common.load;

function bowerCrawl (convert, rootUrl) {
	var crawler = {
		globalDepFolder: join(rootUrl, 'bower_components'),
		load: bowerLoad,
		getChildrenNames: bowerDependencies,
		convert: convert
	};
	var context = bowerContext(crawler, rootUrl, '');

	context.childCrawler = bowerChildCrawler;
	context.all = [];

	return crawl(context)
		.then(function (root) {
			return {
				root: root,
				all: context.all
			}
		});
}

function bowerLoad (context, fileUrl) {
	return load(context, fileUrl)
		['catch'](switchToPackageJson)
		['catch'](provideBlankData);

	function switchToPackageJson () {
		var fileType = context.fileType = 'package.json';
		context.fileUrl = join(context.rootUrl, fileType);
		return load(context, context.fileUrl);
	}

	function provideBlankData () {
		context.fileType = '';
		return null;
	}
}

function bowerContext (base, rootUrl, name) {
	var ctx = Object.create(base);
	ctx.name = name;
	ctx.overrides = Object.create(base.overrides || null);
	ctx.missing = Object.create(base.missing || null);
	return bowerSetState(ctx, rootUrl, name);
}

function bowerSetState (ctx, rootUrl, name) {
	var fileType = 'bower.json';
	ctx.name = name;
	ctx.pmType = 'bower';
	ctx.fileType = fileType;
	ctx.fileUrl = join(rootUrl, fileType);
	ctx.depFolder = join(rootUrl, 'bower_components');
	ctx.rootUrl = rootUrl;
	return ctx;
}

function bowerChildCrawler (context, name) {
	var childRoot = join(context.globalDepFolder, name);
	var childCtx = bowerContext(context, childRoot, name);
	return crawl(childCtx);
}

function bowerDependencies (context, data) {
	return context.fileType === 'bower.json'
		? Object.keys(data.metadata.dependencies || {})
		: [];
}

