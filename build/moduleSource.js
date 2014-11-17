/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = moduleSource;

function moduleSource (resolver, reader) {
	return function (id) {
		return String(reader(resolver(id)));
	};
}
