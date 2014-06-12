/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createNormalizer;

function createNormalizer (idTransform, map, normalize) {
	return function (name, refererName, refererUrl) {
		var normalized = normalize(name, refererName, refererUrl);
		// after we normalize the module id, remove the uid bit and only keep
		// the path, since the map function expects module ids without the uid bit
		// idTransform will convert the module id back to UID
		if (normalized.indexOf('#') > -1) {
			normalized = normalized.split("#")[1];
		}
		return idTransform(map(normalized, refererName), refererName, refererUrl);
	};
}
