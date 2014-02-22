/*===loader===*/
/** RaveJS */
/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
(function (exports, global) {
/*===rave===*/

/*===pipeline===*/

// auto-start if we've been loaded in a browser
if (typeof exports === 'undefined') {
	rave.boot(context);
}

}(
	typeof exports !== 'undefined' ? exports : void 0,
	global = typeof global !== 'undefined' && global
		|| typeof window !== 'undefined' && window
		|| typeof self !== 'undefined' && self
));
