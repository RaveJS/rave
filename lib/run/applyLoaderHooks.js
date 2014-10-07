/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var override = require('../../load/override');

module.exports = applyLoaderHooks;

function applyLoaderHooks (context, extensions) {
	return Promise.all(extensions).then(function (extensions) {
		return extensions.map(function (extension) {
			var api = extension.api;
			if (!api) return;
			if (api.load) {
				context.load.overrides = context.load.overrides.concat(api.load);
			}
		});
	}).then(function () {
		var hooks = override.hooks(context.load.nativeHooks, context.load.overrides);
		for (var name in hooks) {
			context.loader[name] = hooks[name];
		}
	}).then(function () {
		return extensions;
	});
}
