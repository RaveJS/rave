/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var parseUid = require('./uid').parse;
var metadata = require('./metadata');
var normalizeCjs = require('../pipeline/normalizeCjs');
var createNormalizer = require('./createNormalizer');
var createVersionedIdTransform = require('./createVersionedIdTransform');
var createPackageMapper = require('./createPackageMapper');
var locatePackage = require('../pipeline/locatePackage');
var fetchAsText = require('../pipeline/fetchAsText');
var translateAsIs = require('../pipeline/translateAsIs');
var instantiateNode = require('../pipeline/instantiateNode');
var instantiateAmd = require('../pipeline/instantiateAmd');
var instantiateScript = require('../pipeline/instantiateScript');

module.exports = hooksFromMetadata;

function hooksFromMetadata (context) {
	var metadataOverride;

	metadataOverride = {
		predicate: createIsConfigured(context),
		hooks: {
			normalize: createNormalizer(
				createVersionedIdTransform(context),
				createPackageMapper(context),
				normalizeCjs
			),
			locate: withContext(context, locatePackage),
			fetch: fetchAsText,
			translate: translateAsIs,
			instantiate: instantiateNodeOrAmd
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

function instantiateNodeOrAmd (load) {
	var pkg = metadata.findPackage(load.metadata.rave.packages, load.name);
	// prefer amd-formatted modules since they use less string manip?
	if (pkg.moduleType.indexOf('amd') >= 0) {
		return instantiateAmd(load);
	}
	else if (pkg.moduleType.indexOf('node') >= 0) {
		return instantiateNode(load);
	}
	else {
		return instantiateScript(load);
	}
}
