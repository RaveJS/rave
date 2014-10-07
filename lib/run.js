/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var instantiators = require('./debug/instantiators');
var applyLoaderHooks = require('./run/applyLoaderHooks');
var configureLoader = require('./run/configureLoader');
var gatherExtensions = require('./run/gatherExtensions');
var applyFirstMain = require('./run/applyFirstMain');
var initApplication = require('./run/initApplication');

module.exports = {
	main: main,
	applyLoaderHooks: applyLoaderHooks
};

var defaultMeta = 'bower.json,package.json';

function main (context) {
	var applyLoaderHooks;

	applyLoaderHooks = this.applyLoaderHooks;

	return done(context)
		['catch'](failHard);

	function done (context) {

		return configureLoader(getInstantiator)(context)
			.then(gatherExtensions)
			.then(function (extensions) {
				return applyLoaderHooks(context, extensions);
			})
			.then(function (extensions) {
				return applyFirstMain(context, extensions);
			})
			.then(function (alreadyRanMain) {
				return !alreadyRanMain && initApplication(context);
			});
	}
}

function failIfNone (allMetadata) {
	if (allMetadata.roots.length === 0) {
		throw new Error('No metadata files found: ' + context.raveMeta);
	}
	return allMetadata;
}

function getInstantiator (moduleType) {
	return instantiators[moduleType];
}

function failHard (ex) {
	setTimeout(function () { throw ex; }, 0);
}
