/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = translateAsIs;

var addSourceUrl = require('../lib/addSourceUrl');

function translateAsIs (load) {
	var options = load.metadata.rave;
	return options.debug
		? addSourceUrl(load.address, load.source)
		: load.source;
}
