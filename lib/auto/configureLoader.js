/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var fromMetadata = require('../hooksFromMetadata');
var normalizeCjs = require('../../pipeline/normalizeCjs');
var locateAsIs = require('../../pipeline/locateAsIs');
var fetchAsText = require('../../pipeline/fetchAsText');
var translateAsIs = require('../../pipeline/translateAsIs');
var instantiateJs = require('../debug/instantiateJs');
var override = require('../../load/override');

module.exports = configureLoader;

function configureLoader (getInstantiator) {
	return function (context) {
		var baseHooks = {
			normalize: normalizeCjs,
			locate: locateAsIs,
			fetch: fetchAsText,
			translate: translateAsIs,
			instantiate: instantiateJs(getInstantiator)
		};
		var overrides = fromMetadata(baseHooks, context);
		context.load.overrides = overrides;
		var hooks = override.hooks(context.load.nativeHooks, overrides);
		for (var name in hooks) {
			context.loader[name] = hooks[name];
		}
		return Promise.resolve(context);
	};
}
