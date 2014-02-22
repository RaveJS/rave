/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var metadata = require('./metadata');
var path = require('./path');

module.exports = createVersionedIdTransform;

function createVersionedIdTransform (context) {
	var packages;

	packages = context.packages;

	return function (normalized, refUid, refUrl) {
		var refPkg, depPkg;

		refPkg = metadata.findPackage(packages, refUid);
		depPkg = metadata.findDepPackage(packages, refPkg, normalized);

		if (!depPkg) {
			// TODO: should we support implicit dependencies like this?
			depPkg = metadata.findPackage(packages, normalized);
		}

		// translate package main (e.g. "rest" --> "rest/rest")
		if (normalized === depPkg.name && depPkg.main) {
			normalized = path.reduceLeadingDots(depPkg.main, depPkg.name + '/');
		}

		if (normalized.indexOf('#') < 0) {
			// it's not already an uid
			normalized = metadata.createUid(depPkg, normalized);
		}

		return normalized;
	};
}
