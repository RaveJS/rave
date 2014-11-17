/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var moduleSource = require('./moduleSource');
var bundle = require('./bundle');
var merge = require('./merge');
var meta = require('../package.json');
var uid = require('../lib/uid');
var path = require('path');
var fs = require('fs');

module.exports = build;

var write = fs.writeFileSync;
var getSource = moduleSource(require.resolve, fs.readFileSync);

function build (context, modules) {
	var root, uid, mergeData, template, buildCfg, raveBoot;

	root = path.dirname(__dirname);

	uid = raveUid(meta);
	mergeData = {
		raveUid: uid,
		raveMain: uid + '/start',
		raveHooks: uid + '/src/hooks',
		raveBundledContext: 'rave/_/context',
		raveAmdBundle: uid + '/lib/amd/bundle'
	};

	// everything in the src folder should be processed for possible
	// rave uids
	template = mergeUid('../src/_template', mergeData);
	buildCfg = mergeUid('../src/cram.json', mergeData);
	raveBoot = mergeUid('../src/rave', mergeData);

	return bundle(buildCfg, root).then(function (hooks) {
		var files;

		files = {
			promise: getSource('when/es6-shim/Promise'),
			loader: getSource('es6-module-loader/lib/es6-module-loader'),
			rave: removeLicenses(raveBoot),
			hooks: removeLicenses(hooks),
			context: context || '',
			modules: modules || ''
		};

		return merge(template, files);

	});

	function mergeUid (path, mergeData) {
		return merge(getSource(path), mergeData, merge.preserveToken);
	}
}

function raveUid (meta) {
	return uid.create(meta);
}

function removeLicenses (str) {
	return str
		.replace(/\/\*\* @author.*?\*\/\s*\n?/g, '')
		.replace(/\/\*\* @license.*?\*\/\s*\n?/g, '');
}
