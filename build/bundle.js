/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var when = require('when');
var path = require('path');
var os = require('os');
var fs = require('fs');
var cram = require('cram');

module.exports = bundle;

function bundle (cramCfg) {
	var root, tempDir, uid, tempCfgFile, tempOutFile;

	root = raveDir(__dirname);
	// tempDir = os.tmpdir();
	tempDir = path.join(root, 'build/temp');

	tempCfgFile = path.join(tempDir, 'cram.json');
	tempOutFile = path.join(tempDir, 'hooks.js');

	fs.writeFileSync(tempCfgFile, cramCfg);

	return when(cram({
		appRoot: root,
		// oof. cram needs a relative path
		configFiles: [ path.relative(root, tempCfgFile) ],
		output: tempOutFile
	})).then(function () {
		// return bundle
		return '' + fs.readFileSync(tempOutFile);
	});

}

function raveDir (currdir) {
	var parts, i;
	parts = currdir.split(path.sep);
	i = parts.length;
	while (--i > 0) {
		if (parts[i] === 'rave') {
			return parts.slice(0, i + 1).join(path.sep);
		}
	}
	throw new Error('Unable to find rave directory.');
}
