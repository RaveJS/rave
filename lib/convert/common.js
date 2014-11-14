/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var createUid = require('../uid').create;

// main exports

exports.transform = transformData;

// exports for testing

exports.createDepHashMap = createDepHashMap;

function transformData (orig) {
	var metadata, clone;

	// create overridable copy of metadata
	metadata = orig.metadata;

	// copy some useful crawling data
	clone = {
		name: metadata.name || orig.name,
		main: metadata.main,
		version: metadata.version || '0.0.0',
		pmType: orig.pmType,
		fileType: orig.fileType,
		location: orig.rootUrl, // renamed!
		depFolder: orig.depFolder
	};

	// add uid
	clone.uid = createUid(clone);

	// allow access to original metadata
	clone.getMetadata = function () { return metadata || {}; };

	// convert children array to deps hashmap
	clone.deps = createDepHashMap(orig);

	return clone;
}

function createDepHashMap (data) {
	return data.children.reduce(function (hashMap, child) {
		hashMap[child.name] = child.uid;
		return hashMap;
	}, {});
}
