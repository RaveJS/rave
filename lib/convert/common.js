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
	clone = Object.create(metadata);

	// copy some useful crawling data
	clone.pmType = orig.pmType;
	clone.fileType = orig.fileType;
	clone.location = orig.rootUrl;
	clone.depFolder = orig.depFolder;

	// add uid
	if (!clone.name) clone.name = orig.name;
	if (!clone.version) clone.version = '0.0.0';
	clone.uid = createUid(clone);

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
