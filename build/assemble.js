/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var merge = require('./merge');

module.exports = assemble;

function assemble (reader, template, files) {
	var txt, sources;

	txt = reader(template);

	sources = filenamesToSources(reader, files);

	return merge(txt, sources);
}

function filenamesToSources (reader, filenames) {
	var sources = {};
	for (var key in filenames) {
		if (filenames[key]) {
			sources[key] = filenameToSource(reader, filenames[key]);
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

function filenameToSource (reader, filename) {
	return reader(filename);
}

function removeLicenses (str) {
	return str
		.replace(/\/\*\* @author.*?\*\/\s*\n?/g, '')
		.replace(/\/\*\* @license.*?\*\/\s*\n?/g, '');
}
