/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var crawl = require('./lib/crawl');
var instantiators = require('./lib/debug/instantiators');
var assembleAppContext = require('./lib/auto/assembleAppContext');
var applyLoaderHooks = require('./lib/auto/applyLoaderHooks');
var configureLoader = require('./lib/auto/configureLoader');
var gatherExtensions = require('./lib/auto/gatherExtensions');
var applyFirstMain = require('./lib/auto/applyFirstMain');
var initApplication = require('./lib/auto/initApplication');

module.exports = {
	main: autoConfigure,
	applyLoaderHooks: applyLoaderHooks
};

var defaultMeta = 'bower.json,package.json';

function autoConfigure (context) {
	var applyLoaderHooks;

	if (!context.raveMeta) context.raveMeta = defaultMeta;

	context.packages = {};

	applyLoaderHooks = this.applyLoaderHooks;

	return crawl(context.raveMeta)
		.then(failIfNone)
		.then(done)
		['catch'](failHard);

	function done (allMetadata) {

		context.packages = allMetadata.packages;
		context.metadata = allMetadata.roots;
		context = assembleAppContext(context);
		return configureLoader(getInstantiator)(context)
			.then(gatherExtensions)
			.then(function (extensions) {
				// TODO: remove || [] when Promise shim is fixed
				return applyLoaderHooks(context, extensions || []);
			})
			.then(function (extensions) {
				// TODO: remove || [] when Promise shim is fixed
				return applyFirstMain(context, extensions || []);
			})
			.then(function (alreadyRanMain) {
				return !alreadyRanMain && initApplication(context);
			});
	}
}

function failIfNone (allMetadata) {
	if (allMetadata.roots.length === 0) {
		throw new Error('No metadata files found: ' + context.raveMeta);
	}
	return allMetadata;
}

function getInstantiator (moduleType) {
	return instantiators[moduleType];
}

function failHard (ex) {
	setTimeout(function () { throw ex; }, 0);
}
