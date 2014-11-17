/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var normalizeCjs = require('../pipeline/normalizeCjs');
var locateAsIs = require('../pipeline/locateAsIs');
var fetchAsText = require('../pipeline/fetchAsText');
var translateAsIs = require('../pipeline/translateAsIs');
var instantiateJs = require('./debug/instantiateJS');
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
	var baseHooks = {
		normalize: normalizeCjs,
		locate: locateAsIs,
		fetch: fetchAsText,
		translate: translateAsIs,
		instantiate: instantiateJs(getInstantiator)
	};

	applyLoaderHooks = this.applyLoaderHooks;

	return done(context)
		['catch'](failHard);

	function done (context) {

		return configureLoader(baseHooks)(context)
			.then(evalPredefines)
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

function getInstantiator (moduleType) {
	return instantiators[moduleType];
}

function failHard (ex) {
	setTimeout(function () { throw ex; }, 0);
}

function evalPredefines (context) {
	return context.evalPredefines
		? context.evalPredefines(context)
		: context;
}
