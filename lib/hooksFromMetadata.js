/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var parseUid = require('./uid').parse;
var createNormalizer = require('./createNormalizer');
var createVersionedIdTransform = require('./createVersionedIdTransform');
var createPackageMapper = require('./createPackageMapper');
var locatePackage = require('../pipeline/locatePackage');

module.exports = hooksFromMetadata;

function hooksFromMetadata (hooks, context) {
	var metadataOverride;

	metadataOverride = {
		predicate: createIsConfigured(context),
		hooks: {
			normalize: createNormalizer(
				createVersionedIdTransform(context),
				createPackageMapper(context),
				hooks.normalize
			),
			locate: withContext(context, locatePackage), // hooks.locate not used
			fetch: hooks.fetch,
			translate: hooks.translate,
			instantiate: hooks.instantiate
		}
	};

	return [metadataOverride];
}

function createIsConfigured (context) {
	var packages = context.packages;
	return function isConfigured (arg) {
		return parseUid(arg.name).pkgUid in packages;
	};
}

function withContext (context, func) {
	return function (load) {
		load.metadata.rave = context;
		return func.call(this, load);
	};
}
