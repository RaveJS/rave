/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = instantiateScript;

var globalFactory = require('../lib/globalFactory');

function instantiateScript (load) {
	var factory = globalFactory(this, load);
	return {
		execute: function () {
			return new Module(factory());
		}
	};
}
