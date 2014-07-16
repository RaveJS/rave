/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var es5Transform = require('../lib/es5Transform');
var addSourceUrl = require('../lib/addSourceUrl');

module.exports = instantiateJson;

function instantiateJson (load) {
	var source, loader;

	source = '(' + load.source + ')';
	loader = load.metadata.rave.loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		source = addSourceUrl(load.address, source);
	}

	return {
		execute: function () {
			return loader.newModule(es5Transform.toLoader(eval(source)));
		}
	};
}
