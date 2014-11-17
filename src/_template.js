/*===promise===*/

/*===loader===*/

/** RaveJS */
/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
(function (bundle) {
var exports = {}, context = {}, define;

/*===rave===*/

// initialize rave boot sequence
exports.init(context);

// eval rave's minimal set of startup modules ("hooks")
define = exports.simpleDefine(context);

/*===hooks===*/

// eval any bundled context (e.g. from a rave build)
define = exports.contextDefine(context);

/*===context===*/

// pass forward any predefined modules (e.g. from a rave build)
context.evalPredefines = exports.evalPredefines(bundle);

// go!
exports.boot(context);

}(function (define) {

/*===modules===*/

}.bind(this)));
