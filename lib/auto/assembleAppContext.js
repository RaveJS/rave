/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var join = require('../path').joinPaths;

module.exports = assembleAppContext;

function assembleAppContext (context) {
	// TODO: if no main modules found, look for one in a conventional place
	// TODO: warn if multiple main modules were found, but only the first was run
	var first;

	first = context.metadata[0]; // precondition: must be at least one

	context.app = {
		name: first.name,
		main: join(first.name, first.main),
		metadata: first
	};

	return createEnv(context, first);
}

function createEnv (context, metadata) {
	var metaEnv, key;

	if (!context.env) context.env = {};

	metaEnv = metadata.metadata.rave;
	metaEnv = metaEnv && metaEnv.env || {};

	for (key in metaEnv) {
		context.env[key] = metaEnv[key];
	}

	if (!('debug' in context.env)) context.env.debug = true;

	return context;
}
