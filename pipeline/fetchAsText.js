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
	if (env === 'node') return require.async('../lib/fetchNodeText');
	else return Promise.resolve(fetchXhrText);
}

function detectEnv () {
	try {
		// try to get the fs module since we're going to use it
		global.require('fs');
		return 'node';
	}
	catch (ex) {
		return 'browser';
	}
}
