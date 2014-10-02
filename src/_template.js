/*===promise===*/
/*===loader===*/

// es6-module-loader doesn't export to the current scope in node
var Loader, Module;
if (typeof exports !== 'undefined') {
	if (typeof Loader === 'undefined') Loader = exports.Loader;
	if (typeof Module === 'undefined') Module = exports.Module;
}

/** RaveJS */
/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
(function (exports, global) {
/*===rave===*/

}(
	typeof exports !== 'undefined' ? exports : void 0,
	typeof self !== 'undefined' && self
		|| typeof global !== 'undefined' && global
));

/*===hooks===*/
/*===modules===*/
