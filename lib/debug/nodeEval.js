/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var injectScript = require('./injectScript');

module.exports = nodeEval;

function nodeEval (global, require, exports, module, source, debugTransform) {
	var script;
	script = debugTransform(
		'__rave_node(function (require, exports, module, global) {'
		+ source
		+ '\n})\n'
	);
	global.__rave_node = __rave_node;
	try {
		injectScript(script);
	}
	finally {
		delete global.__rave_node;
	}
	function __rave_node (factory) {
		factory(require, exports, module, global);
	}
}
