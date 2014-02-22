/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var normalizeCjs = require('../pipeline/normalizeCjs');
var locatePackage = require('../pipeline/locatePackage');
var locateAsIs = require('../pipeline/locateAsIs');
var fetchAsText = require('../pipeline/fetchAsText');
var translateAsIs = require('../pipeline/translateAsIs');
var translateWrapObjectLiteral = require('../pipeline/translateWrapObjectLiteral');
var instantiateNode = require('../pipeline/instantiateNode');
var instantiateScript = require('../pipeline/instantiateScript');
var overrideIf = require('../lib/overrideIf');
var pkg = require('../lib/package');
var beget = require('../lib/beget');

module.exports = _ravePipeline;

function _ravePipeline (context) {
	var modulePipeline, jsonPipeline;

	context = beget(context);
	if (context.packages) {
		context.packages = pkg.normalizeCollection(context.packages);
	}

	modulePipeline = {
		normalize: normalizeCjs,
		locate: withContext(context, locatePackage),
		fetch: fetchAsText,
		translate: translateAsIs,
		instantiate: instantiateNode
	};

	jsonPipeline = {
		normalize: normalizeCjs,
		locate: withContext(context, locateAsIs),
		fetch: fetchAsText,
		translate: translateWrapObjectLiteral,
		instantiate: instantiateScript
	};

	return {
		applyTo: function (loader) {
			overrideIf(createRavePredicate(context), loader, modulePipeline);
			overrideIf(isJsonFile, loader, jsonPipeline);
		}
	};
}

function createRavePredicate (context) {
	return function (arg) {
		var moduleId, packageId;
		// Pipeline functions typically receive an object with a normalized name,
		// but the normalize function takes an unnormalized name and a normalized
		// referrer name.
		moduleId = getModuleId(arg);
		// check if this is the rave-main module
		if (moduleId === context.raveMain) return true;
		if (moduleId.charAt(0) === '.') moduleId = arguments[1];
		packageId = moduleId.split('/')[0];
		return packageId === 'rave';
	};
}

function isJsonFile (arg) {
	var moduleId, ext;
	moduleId = getModuleId(arg);
	ext = moduleId.split('.').pop();
	return ext === 'json';
}

function getModuleId (arg) {
	return typeof arg === 'object' ? arg.name : arg;
}

function withContext (context, func) {
	return function (load) {
		load.metadata.rave = context;
		return func.call(this, load);
	};
}
