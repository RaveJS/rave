/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var injectScript = require('./injectScript');

module.exports = scriptEval;

function scriptEval (source) {
	injectScript(source);
}
