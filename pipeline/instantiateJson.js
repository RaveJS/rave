/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var jsonFactory = require('../lib/json/factory');

module.exports = instantiateJson;

function instantiateJson (load) {
	var loader = load.metadata.rave.loader;
	return {
		execute: function () {
			return new Module(jsonFactory(loader, load));
		}
	};
}
