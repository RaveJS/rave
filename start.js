/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var autoConfigure = require('./auto');
var run = require('./lib/run');
var debug = require('./debug');

exports.main = function (context) {
	debug.start(context);
	// Temporary way to not autoConfigure if it has been done already (e.g. in a build)
	return Promise.resolve(context.packages ? context : autoConfigure(context))
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
