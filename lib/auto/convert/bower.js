/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var common = require('./common');
var path = require('../../path');

var copy = common.copy;
var createDeps = common.createDeps;

// main exports

exports.convert = bowerConvert;

// exports for testing

exports.bowerFixups = bowerFixups;
exports.bowerFindJsMain = bowerFindJsMain;
exports.bowerAdjustLocation = bowerAdjustLocation;

function bowerConvert (data) {
	return bowerFixups(copy(data));
}

function bowerFixups (data) {
	if (!data.version) data.version = '0.0.0';
	data.main = path.removeExt(bowerFindJsMain(data) || data.name);
	return bowerAdjustLocation(data);
}

function bowerFindJsMain (data) {
	var mains, i;
	mains = data.main;
	if (typeof mains === 'string' || !mains) return mains;
	for (i = 0; i < mains.length; i++) {
		if (mains[i].slice(-3) === '.js') return mains[i];
	}
}

function bowerAdjustLocation (data) {
	var mainPath;
	mainPath = path.splitDirAndFile(data.main);
	if (mainPath[0]) {
		data.location = path.joinPaths(data.location, mainPath[0]);
		data.main = mainPath[1];
	}
	return data;
}
