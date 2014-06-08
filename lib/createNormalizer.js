/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createNormalizer;

function createNormalizer (idTransform, map, normalize) {
	return function (name, refererName, refererUrl) {
		var normalized = normalize(name, refererName, refererUrl);
		var mapped = map(normalized, refererName, refererUrl);
		return idTransform(mapped, refererName, refererUrl);
	};
}
