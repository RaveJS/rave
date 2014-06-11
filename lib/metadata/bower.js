/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('../path');
var base = require('./base');

var bowerCrawler = Object.create(base);

// TODO: remove matches on 'cujo' <-- HACK!
var findAmdRx = /\bamd\b|\bumd\b|\bcujo\b|\bcujojs\b|\brequirejs\b/i;

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
	var descr, mainPath;
	descr = base.createDescriptor.call(this, metadata);
	descr.metaType = 'bower';
	descr.moduleType = this.findModuleType(metadata);
	descr.main = metadata.main && this.findJsMain(metadata.main);
	if (descr.main) {
		if (!this.isGlobalScript(descr)) {
			descr.main = path.removeExt(descr.main);
		}
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
	if ('moduleType' in meta) return meta.moduleType;
	return (meta.name && findAmdRx.test(meta.name))
		|| (meta.description && findAmdRx.test(meta.description))
		|| (meta.keywords && findAmdRx.test(meta.keywords.join(',')))
		? ['amd']
		: ['globals'];
};

bowerCrawler.isGlobalScript = function (descr) {
	return descr.moduleType[0] === 'globals' && descr.moduleType.length === 1;
}
