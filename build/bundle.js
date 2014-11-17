/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var when = require('when');
var path = require('path');
var os = require('os');
var fs = require('fs');
var cram = require('cram');

module.exports = bundle;

function bundle (cramCfg, root) {
	var tempDir, tempCfgFile, tempOutFile;

	// tempDir = os.tmpdir();
	tempDir = mkdir('.cram/temp');

	tempCfgFile = path.join(tempDir, 'cram.json');
	tempOutFile = path.join(tempDir, 'hooks.js');

	fs.writeFileSync(tempCfgFile, cramCfg);

	return when(cram({
		appRoot: root,
		configFiles: [ tempCfgFile ],
		output: tempOutFile
	})).then(function () {
		// clean up after cram
		delete global.define;
		// return bundle
		return '' + fs.readFileSync(tempOutFile);
	});

}

function mkdir (dirname) {
	var folders = path.relative(process.cwd(), dirname).split(path.sep);
	return folders.reduce(function (pathSoFar, folder) {
		pathSoFar = path.join(pathSoFar, folder);
		try {
			fs.mkdirSync(pathSoFar);
		}
		catch (ex) {
			if (ex.code !== 'EEXIST') throw ex;
		}
		return pathSoFar;
	}, '');
}
