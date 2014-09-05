/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var common = require('./common');
var path = require('../path');

var transform = common.transform;
var createDeps = common.createDeps;

// main exports

exports.convert = bowerConvert;

// exports for testing

exports.bowerFixups = bowerFixups;

function bowerConvert (data) {
	return bowerFixups(transform(data));
}

function bowerFixups (data) {
	var metadata = data.getMetadata();
	if (metadata.moduleType) {
		data.moduleType = metadata.moduleType;
	}
	data.main = path.removeExt(bowerFindJsMain(data));
	return bowerAdjustLocation(data);
}

function bowerFindJsMain (data) {
	var mains, i;
	mains = data.main;
	if (mains && typeof mains === 'object') {
		for (i = 0; i < mains.length; i++) {
			if (mains[i].slice(-3) === '.js') return mains[i];
		}
	}
	return mains || data.name;
}

function bowerAdjustLocation (data) {
	var metadata, mainPath;
	metadata = data.getMetadata();
	if (metadata.directories && metadata.directories.lib) {
		data.location = metadata.directories.lib;
	}
	else {
		mainPath = path.splitDirAndFile(data.main);
		if (mainPath[0]) {
			data.location = path.joinPaths(data.location, mainPath[0]);
			data.main = mainPath[1];
		}
	}
	return data;
}
