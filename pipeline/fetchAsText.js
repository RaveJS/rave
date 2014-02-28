/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = fetchAsText;

// pre-load browser fetcher so it will be built in to rave.js
var fetchXhrText = require('../lib/fetchXhrText');

function fetchAsText (load) {
	// get fetchText on first use
	var fetcher = getFetchText(load.metadata.rave.environ);
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
