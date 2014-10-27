/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var fromMetadata = require('../hooksFromMetadata');
var override = require('../../load/override');

module.exports = configureLoader;

function configureLoader (baseHooks) {
	return function (context) {
		var overrides = fromMetadata(baseHooks, context);
		context.load.overrides = overrides;
		var hooks = override.hooks(context.load.nativeHooks, overrides);
		for (var name in hooks) {
			context.loader[name] = hooks[name];
		}
		return Promise.resolve(context);
	};
}
