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
var findAmdEvidence = require('./find/amdEvidence');

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
			instantiate: instantiate
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

function instantiate (load) {
	var pkg, moduleType;

	pkg = metadata.findPackage(load.metadata.rave.packages, load.name);
	moduleType = pkg.moduleType;

	// prefer amd-formatted modules since they use less string manip
	if (hasModuleType(moduleType, 'amd')) {
		return instantiateAmd(load);
	}
	else if (hasModuleType(moduleType, 'node')) {
		return instantiateNode(load);
	}
	else if (hasModuleType(moduleType, 'globals')) {
		return instantiateScript(load);
	}
	else if (moduleType = guessModuleType(load)) {
		pkg.moduleType = moduleType; // fix package!
		return instantiate(pkg); // try again :)
	}
	else {
		throw new Error('Unable to determine moduleType for ' + load.name);
	}
}

function hasModuleType (moduleType, type) {
	return moduleType.indexOf(type) >= 0;
}

function guessModuleType (load) {
	var evidence = findAmdEvidence(load.source);
	return evidence.isAmd && [ 'amd' ];
}
