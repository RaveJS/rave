/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = instantiateScript;

var globalFactory = require('../lib/globalFactory');
var addSourceUrl = require('../lib/addSourceUrl');

function instantiateScript (load) {

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	var factory = globalFactory(this, load);
	return {
		execute: function () {
			return new Module(factory());
		}
	};

}
