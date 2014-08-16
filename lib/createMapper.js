/** @license MIT License (c) copyright 2014 original authors */
/** @author Karolis Narkevicius */
var metadata = require('./metadata');
var path = require('./path');

module.exports = createMapper;

function createMapper (context) {
	var packages;

	packages = context.packages;

	return function (normalizedName, refUid) {
		var refPkg, mappedId;

		refPkg = metadata.findPackage(packages, refUid);

		if (refPkg.mapFunc) {
			mappedId = refPkg.mapFunc(normalizedName);
		}
		else if (refPkg.map) {
			if (normalizedName in refPkg.map) {
				mappedId = refPkg.map[normalizedName];
			}
		}

		// mappedId can be undefined, false, or a string
		// undefined === no mapping, return original id
		// false === do not load a module by this id, use blank module
		// string === module id was mapped, return mapped id
		return typeof mappedId === 'undefined'
			? normalizedName
			: mappedId === false
				? 'rave/lib/blank'
				: mappedId;
	};
}
