/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var fs = require('fs');
var moduleSource = require('./moduleSource');
var merge = require('./merge');

module.exports = concat;

function concat (resolver, template, dest, files) {
	var getSource, txt, sources, built;

	getSource = moduleSource(resolver, fs.readFileSync);

	txt = getSource(template);

	sources = filenamesToSources(getSource, files);

	built = merge(txt, sources);

	fs.writeFileSync(dest, built);
}

function filenamesToSources (getter, filenames) {
	var sources = {};
	for (var key in filenames) {
		if (filenames[key]) {
			sources[key] = filenameToSource(getter, filenames[key]);
		}
		else {
			sources[key] = '';
		}
		// TODO: this is kinda lame. remove special case handling somehow
		if (key === 'rave' || key === 'hooks') {
			sources[key] = removeLicenses(sources[key]);
		}
	}
	return sources;
}

function filenameToSource (getter, filename) {
	return getter(filename);
}

function removeLicenses (str) {
	return str
		.replace(/\/\*\* @author.*?\*\/\s*\n?/g, '')
		.replace(/\/\*\* @license.*?\*\/\s*\n?/g, '');
}
