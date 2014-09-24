/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var es5Transform = require('../es5Transform');
var jsonEval = require('./eval');

module.exports = jsonFactory;

function jsonFactory (loader, load) {
	return es5Transform.toLoader(jsonEval(load.source));
}
