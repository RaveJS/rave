/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = fetchAsText;

// pre-load browser fetcher so it will be built in to rave.js
var fetchXhrText = require('../lib/fetchXhrText');

var env = detectEnv();

function fetchAsText (load) {
	// get fetchText on first use
	var fetcher = getFetchText(env);
	return Promise.resolve(fetcher).then(function (fetchText) {
		return new Promise(function(resolve, reject) {
			fetchText(load.address, resolve, reject);
		});
	});
}

function getFetchText (env) {
	return Promise.resolve(
		env === 'node'
			? (require)('../lib/fetchNodeText')
			: fetchXhrText
	);
}

function detectEnv () {
	var test
	// try to get the fs module since we're going to use it
	// we're using parens to hide `require` from cram.js
	try { test = (require)('fs'); } catch (ex) {}
	return test ? 'node' : 'browser';
}
