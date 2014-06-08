/** @license MIT License (c) copyright 2014 original authors */
var createUid = require('./uid').create;
var metadata = require('./metadata');
var path = require('./path');

module.exports = createMapper;

function createMapper (context, normalize) {
	var packages;

	packages = context.packages;

	return function (normalized, refUid, refUrl) {
		var refPkg, mappedId;

		refPkg = metadata.findPackage(packages, refUid);

		if (refPkg.map) {
			for (mappedId in refPkg.map) {
				if (normalize(mappedId, refUid, refUrl) === normalized) {
					return normalize(refPkg.map[mappedId], refUid, refUrl);
				}
			}
		}

		return normalized;
	};
}