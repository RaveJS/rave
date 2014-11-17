/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var common = require('./common');
var path = require('../path');
var normalize = require('../../pipeline/normalizeCjs');

var transform = common.transform;
var createDeps = common.createDeps;

// main exports

exports.convert = npmConvert;

// exports for testing

exports.npmFixups = npmFixups;
exports.npmBrowserMap = npmBrowserMap;

function npmConvert (data) {
	return npmFixups(transform(data));
}

function npmFixups (data) {
	var metadata, main;
	metadata = data.metadata;
	main = (typeof metadata.browser === "string" && metadata.browser)
		|| data.main || 'index';
	data.main = path.removeExt(main);
	if (typeof metadata.browser === 'object') {
		data.mapFunc = npmBrowserMap(normalizeMap(metadata.browser, path.joinPaths(data.name, data.main)));
	}
	if (metadata.directories && metadata.directories.lib) {
		data.location = path.joinPaths(data.location, metadata.directories.lib);
	}
	return data;
}

function normalizeMap (map, refId) {
	var normalized = {}, path;
	for (path in map) {
		normalized[normalize(path, refId)] = map[path]
			? normalize(map[path], refId)
			: false;
	}
	return normalized;
}

function npmBrowserMap (normalized) {
	return function (name) {
		if (name in normalized) {
			return normalized[name] === false ? false : normalized[name];
		}
	};
}
