/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('../path');
var base = require('./base');
var createUid = require('../uid').create;
var normalize = require('../../pipeline/normalizeCjs');

var npmCrawler = Object.create(base);

module.exports = npmCrawler;

npmCrawler.libFolder = 'node_modules';

npmCrawler.metaName = 'package.json';

npmCrawler.setPackage = function (name) {
	base.setPackage.call(this, name);
	this.depRoot = path.joinPaths(this.pkgRoot, this.libFolder);
	return name;
};

npmCrawler.createDescriptor = function (metadata) {
	var descr, pkgRoot;
	descr = base.createDescriptor.call(this, metadata);
	descr.metaType = 'npm';
	descr.moduleType = metadata.moduleType || ['node'];
	if (metadata.main) {
		descr.main = path.removeExt(metadata.main);
	}
	if (metadata.browser) {
		if (typeof metadata.browser === "string") {
			descr.main = path.removeExt(metadata.browser);
		} else {
			pkgRoot = createUid(descr, descr.name + "/index");
			descr.map = normalizeMap(metadata.browser, pkgRoot);
		}
	}
	return descr;
};

function normalizeMap (map, refId) {
	var normalized = {}, path;
	for (path in map) {
		normalized[normalize(path, refId)] = map[path]
			? normalize(map[path], refId)
			: false;
	}
	return normalized;
}
