/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var normalizeCjs = require('rave/pipeline/normalizeCjs');
var locateAsIs = require('rave/pipeline/locateAsIs');
var fetchAsText = require('rave/pipeline/fetchAsText');
var translateAsIs = require('rave/pipeline/translateAsIs');
var instantiateNode = require('rave/pipeline/instantiateNode');
var instantiateJson = require('rave/pipeline/instantiateJson');
var path = require('rave/lib/path');
var beget = require('rave/lib/beget');
var override = require('rave/load/override');

module.exports = _ravePipeline;

function _ravePipeline (context) {
	var nativeHooks, resetOverride, raveOverride, jsonOverride, overrides,
		newHooks;

	nativeHooks = getLoaderHooks(context.loader);
	context.load = { nativeHooks: nativeHooks };

	context = beget(context);

	// we need this until Loader spec and shim stabilize
	resetOverride = {
		hooks: {
			normalize: normalizeCjs,
			fetch: fetchAsText,
			translate: translateAsIs
		}
	};

	// load things in rave package
	raveOverride = {
		package: 'rave',
		hooks: {
			locate: locateRaveWithContext(context),
			instantiate: instantiateNode
		}
	};

	// load json metadata files
	jsonOverride = {
		extensions: [ '.json' ],
		hooks: {
			locate: withContext(context, locateAsIs),
			instantiate: instantiateJson
		}
	};

	overrides = [resetOverride, raveOverride, jsonOverride];
	newHooks = override.hooks(nativeHooks, overrides);

	return setLoaderHooks(context.loader, newHooks);

}

function getLoaderHooks (loader) {
	return {
		normalize: loader.normalize,
		locate: loader.locate,
		fetch: loader.fetch,
		translate: loader.translate,
		instantiate: loader.instantiate
	};
}

function setLoaderHooks (loader, hooks) {
	for (var p in hooks) loader[p] = hooks[p];
	return loader;
}

function withContext (context, func) {
	return function (load) {
		load.metadata.rave = context;
		return func.call(this, load);
	};
}

function locateRaveWithContext (context) {
	var parts = context.raveScript.split('/');
	parts.pop(); // script file
	parts.pop(); // script directory
	var base = parts.join('/');
	return function (load) {
		load.metadata.rave = context;
		return path.joinPaths(base, path.ensureExt(load.name, '.js'));
	};
}
