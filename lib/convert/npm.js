/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var common = require('./common');
var path = require('../path');

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
	var main = (typeof data.browser === "string" && data.browser)
		|| data.main || 'index';
	data.main = path.removeExt(main);
	if (typeof data.browser === 'object') {
// TODO: use data.map as a function instead of a hashmap
		data.map = normalizeMap(data.browser, data.name + '/index');
		data.mapFunc = npmBrowserMap(data.browser, data.name + '/index');
	}
	if (!data.moduleType) data.moduleType = ['node'];
	if (data.directories && data.directories.lib) {
		data.location = path.joinPaths(data.rootUrl, data.directories.lib);
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

function npmBrowserMap (map, main) {
	// can return undefined, false, or a string
	// undefined === no mapping
	// false === do not load a module by this name
	// string === a mapped module name
	return function (normalize, name) {
		if (name in map) {
			return map[name] === false ? false : normalize(map[name], main);
		}
	};
}
