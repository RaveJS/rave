/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var autoConfigure = require('./auto');
var run = require('./lib/run');
var debug = require('./debug');

var contextModuleName = 'rave/_/context';

exports.main = function (context) {
	var bundledContext = getContextModule(context);
	if (bundledContext) {
		// TODO: merge some things?
		context = bundledContext;
	}
	debug.start(context);
	return Promise.resolve(bundledContext || autoConfigure(context))
		.then(
			function (context) {
				debug.assertNoConflicts(context);
				return context;
			},
			function (ex) {
				debug.assertNoConflicts(context);
				throw ex;
			}
		)
		.then(debug.logOverrides)
		.then(
			function (context) {
				return run.main(context);
			}
		);
};

var applyLoaderHooks = run.applyLoaderHooks;

run.applyLoaderHooks = function (context, extensions) {
	debug.assertRavePackage(context);
	return applyLoaderHooks.call(this, context, extensions)
		.then(function (result) {
			debug.installDebugHooks(context);
			return result;
		});
};

function getContextModule (context) {
	var loader = context.loader;
	if (loader.has(contextModuleName)) {
		return loader.get(contextModuleName);
	}
}
