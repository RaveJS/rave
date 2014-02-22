/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = fetchAsText;

var fetchText = require('../lib/fetchText');
var Thenable = require('../lib/Thenable');

function fetchAsText (load) {
	return Thenable(function(resolve, reject) {
		fetchText(load.address, resolve, reject);
	});

}
