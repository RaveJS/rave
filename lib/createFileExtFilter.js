/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createFileExtFilter;

/**
 * Creates a filter for a loader pipeline based on file extensions.
 * @param {string|Array<string>|Object} extensions may be a single string
 *   containing a comma-separated list of file extensions, an array of file
 *   extensions, or an Object literal whose keys are file extensions.
 * @returns {function(Object|string): boolean}
 */
function createFileExtFilter (extensions) {
	var map = toHashmap(extensions);
	return function (load) {
		var name = typeof load === 'object' ? load.name : load;
		var dot = name ? name.lastIndexOf('.') : -1;
		var slash = name ? name.lastIndexOf('/') : -1;
		return dot > slash && map.hasOwnProperty(name.slice(dot + 1));
	}
}

function toHashmap (it) {
	var map = {}, i;
	if (!it) {
		throw new TypeError('Invalid type passed to createFileExtFilter.');
	}
	if (typeof it === 'string') {
		it = it.split(/\s*,\s*/);
	}
	if (it.length) {
		for (i = 0; i < it.length; i++) {
			map[it[i]] = 1;
		}
	}
	else {
		for (i in it) {
			map[i] = 1;
		}
	}
	return map;
}
