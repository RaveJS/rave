/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var join = require('../path').joinPaths;
var common = require('./common');

// main exports

exports.crawl = npmCrawl;

// exports for testing

exports.npmLoad = npmLoad;
exports.npmContext = npmContext;
exports.npmSetState = npmSetState;
exports.npmChildCrawler = npmChildCrawler;
exports.npmDependencies = npmDependencies;

var crawl = common.crawl;
var load = common.load;

function npmCrawl (convert, rootUrl) {
	var crawler = {
		load: npmLoad,
		getChildrenNames: npmDependencies,
		convert: convert
	};
	var context = npmContext(crawler, rootUrl, '');

	context.childCrawler = npmChildCrawler;
	context.all = [];

	return crawl(context)
		.then(function (root) {
			return {
				root: root,
				all: context.all
			}
		});
}

function npmContext (base, rootUrl, name) {
	var ctx = Object.create(base);
	ctx.parent = base;
	ctx.overrides = Object.create(base.overrides || null);
	ctx.missing = Object.create(base.missing || null);
	return npmSetState(ctx, rootUrl, name);
}

function npmSetState (ctx, rootUrl, name) {
	var fileType = 'package.json';
	ctx.name = name;
	ctx.pmType = 'npm';
	ctx.fileType = fileType;
	ctx.fileUrl = join(rootUrl, fileType);
	ctx.depFolder = join(rootUrl, 'node_modules');
	ctx.rootUrl = rootUrl;
	return ctx;
}

function npmChildCrawler (context, name) {
	var childRoot = join(context.depFolder, name);
	var childCtx = npmContext(context, childRoot, name);
	return crawl(childCtx);

}

function npmDependencies (context, data) {
	return Object.keys(data.metadata.dependencies || {})
		.concat(Object.keys(data.metadata.peerDependencies || {}));
}

function npmLoad (context, fileUrl) {
	return load(context, fileUrl)
		['catch'](function (ex) {
			return npmTraverseUp(context, fileUrl);
		});
}

function npmTraverseUp (context, fileUrl) {
	var grandParent, grandRoot;
	// /client/node_modules/foo/node_modules/bar/package.json
	// /client/node_modules/bar/package.json

	if (!context.origFileUrl) context.origFileUrl = fileUrl;

	grandParent = context.parent && context.parent.parent;
	if (!grandParent || !grandParent.depFolder) {
		throw new Error('Did not find ' + context.origFileUrl);
	}

	grandRoot = join(grandParent.depFolder, context.name);
	npmSetState(context, grandRoot, context.name);

	return npmLoad(context, context.fileUrl);
}
