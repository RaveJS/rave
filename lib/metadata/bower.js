/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('../path');
var base = require('./base');

var bowerCrawler = Object.create(base);

// TODO: remove matches on 'cujo' <-- HACK!
var findAmdRx = /\bamd\b|\bcujo\b/i;

module.exports = bowerCrawler;

bowerCrawler.libFolder = 'bower_components';

bowerCrawler.metaName = 'bower.json';

bowerCrawler.altMetaName = 'package.json';

bowerCrawler.fetchMetaFile = function () {
	var url = path.joinPaths(this.pkgRoot, this.metaName);
	return require.async(url)['catch'](this.fetchAltMetaFile.bind(this));
};

bowerCrawler.fetchAltMetaFile = function () {
	var url = path.joinPaths(this.pkgRoot, this.altMetaName);
	return require.async(url);
};

bowerCrawler.createDescriptor = function (metadata) {
	var descr;
	descr = base.createDescriptor.call(this, metadata);
	descr.metaType = 'bower';
	descr.moduleType = this.findModuleType(metadata);
	descr.main = metadata.main && this.findJsMain(metadata.main);
	if (descr.main && descr.moduleType !== 'script') {
		descr.main = path.removeExt(descr.main);
	}
	return descr;
};

bowerCrawler.findJsMain = function (mains) {
	if (typeof mains === 'string') return mains;
	for (var i = 0; i < mains.length; i++) {
		if (mains[i].slice(-2) === 'js') return mains[i];
	}
};

bowerCrawler.findModuleType = function findModuleType (meta) {
	if (meta.moduleType in { amd: 1, umd: 1 }) return 'amd';
	if (meta.moduleType in { global: 1, script: 1 }) return 'script';
	if ('moduleType' in meta) return meta.moduleType;
	return (meta.name && findAmdRx.test(meta.name))
		|| (meta.description && findAmdRx.test(meta.description))
		|| (meta.keywords && (meta.keywords.indexOf('amd') >= 0 || meta.keywords.indexOf('cujo') >= 0))
		? 'amd'
		: 'script';
};
