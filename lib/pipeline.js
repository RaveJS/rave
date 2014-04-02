/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var parseUid = require('./uid').parse;
var metadata = require('./metadata');
var normalizeCjs = require('../pipeline/normalizeCjs');
var createNormalizer = require('./createNormalizer');
var createVersionedIdTransform = require('./createVersionedIdTransform');
var locatePackage = require('../pipeline/locatePackage');
var fetchAsText = require('../pipeline/fetchAsText');
var translateAsIs = require('../pipeline/translateAsIs');
var instantiateNode = require('../pipeline/instantiateNode');
var instantiateAmd = require('../pipeline/instantiateAmd');
var instantiateScript = require('../pipeline/instantiateScript');
var overrideIf = require('./overrideIf');

module.exports = pipelineFromMetadata;

function pipelineFromMetadata (context) {
	var pipeline;

	pipeline = {
		normalize: createNormalizer(
			createVersionedIdTransform(context),
			normalizeCjs
		),
		locate: withContext(context, locatePackage),
		fetch: fetchAsText,
		translate: translateAsIs,
		instantiate: instantiateNodeOrAmd
	};

	return {
		applyTo: function (loader) {
			overrideIf(createIsConfigured(context), loader, pipeline);
		}
	}
}

function createIsConfigured (context) {
	var packages = context.packages;
	return function isConfigured (arg) {
		var pkgUid;
		if (typeof arg === 'string') {
			// arg is an abstract (non-unique) name
			if (arg.charAt(0) === '.') {
				// arg is relative, use the referer's name
				pkgUid = parseUid(arguments[1]).pkgUid;
			}
			else {
				pkgUid = arg.split('/')[0];
			}
		}
		else {
			// arg is a load context with an uid
			pkgUid = parseUid(arg.name).pkgUid;
		}
		return pkgUid in packages;
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
