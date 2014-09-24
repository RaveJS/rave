/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var injectScript = require('./injectScript');

module.exports = amdEval;

var noDefine = {};

function amdEval (global, define, source) {
	var prevDefine = 'define' in global ? global.define : noDefine;
	global.define = define;
	try {
		injectScript(source);
	}
	finally {
		if (global.define === noDefine) {
			delete global.define;
		}
		else {
			global.define = prevDefine;
		}
	}
}
