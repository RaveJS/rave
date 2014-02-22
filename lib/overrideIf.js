/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = overrideIf;

function overrideIf (predicate, base, props) {
	for (var p in props) {
		if (p in base) {
			base[p] = choice(predicate, props[p], base[p]);
		}
	}
}

function choice (predicate, a, b) {
	return function () {
		var f = predicate.apply(this, arguments) ? a : b;
		return f.apply(this, arguments);
	};
}
