/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var normalizeCjs = require('lode/pipeline/normalizeCjs');
var locatePackage = require('lode/pipeline/locatePackage');
var locateAsIs = require('lode/pipeline/locateAsIs');
var fetchAsText = require('lode/pipeline/fetchAsText');
var translateAsIs = require('lode/pipeline/translateAsIs');
var translateWrapObjectLiteral = require('lode/pipeline/translateWrapObjectLiteral');
var instantiateNode = require('lode/pipeline/instantiateNode');
var instantiateScript = require('lode/pipeline/instantiateScript');
var overrideIf = require('lode/lib/overrideIf');
var pkg = require('lode/lib/package');
var beget = require('lode/lib/beget');

module.exports = _lodePipeline;

function _lodePipeline (context) {
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
			overrideIf(createLodePredicate(context), loader, modulePipeline);
			overrideIf(isJsonFile, loader, jsonPipeline);
		}
	};
}

function createLodePredicate (context) {
	return function (arg) {
		var moduleId, packageId;
		// Pipeline functions typically receive an object with a normalized name,
		// but the normalize function takes an unnormalized name and a normalized
		// referrer name.
		moduleId = getModuleId(arg);
		// check if this is the lode-main module
		if (moduleId === context.lodeMain) return true;
		if (moduleId.charAt(0) === '.') moduleId = arguments[1];
		packageId = moduleId.split('/')[0];
		return packageId === 'lode';
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
		load.metadata.lode = context;
		return func.call(this, load);
	};
}
