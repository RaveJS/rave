/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('../path');
var base = require('./base');

var npmCrawler = Object.create(base);

module.exports = npmCrawler;

npmCrawler.libFolder = 'node_modules';

npmCrawler.metaName = 'package.json';

npmCrawler.setPackage = function (name) {
	base.setPackage.call(this, name);
	this.depRoot = path.joinPaths(this.pkgRoot, this.libFolder);
	return name;
};

npmCrawler.createDescriptor =  function (metadata) {
	var descr, mainPath;
	descr = base.createDescriptor.call(this, metadata);
	descr.metaType = 'npm';
	descr.moduleType = metadata.moduleType || ['node'];
	if (metadata.main) {
		descr.main = path.removeExt(metadata.main);
		mainPath = path.splitDirAndFile(descr.main);
		if (mainPath[0]) {
			descr.location = path.joinPaths(descr.location, mainPath[0]);
			descr.main = mainPath[1];
		}
	}
	return descr;
};
