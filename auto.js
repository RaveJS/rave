/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var crawl = require('./lib/crawl');
var assembleAppContext = require('./lib/auto/assembleAppContext');

module.exports = autoConfigure;

var defaultMeta = 'bower.json,package.json';

function autoConfigure (context) {
	if (!context.raveMeta) context.raveMeta = defaultMeta;

	context.packages = {};

	return crawl(context.raveMeta)
		.then(failIfNone)
		.then(done);

	function done (allMetadata) {
		context.packages = allMetadata.packages;
		context.metadata = allMetadata.roots;
		context = assembleAppContext(context);
		return context;
	}
}

function failIfNone (allMetadata) {
	if (allMetadata.roots.length === 0) {
		throw new Error('No metadata files found: ' + context.raveMeta);
	}
	return allMetadata;
}
