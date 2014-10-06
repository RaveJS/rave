/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var fs = require('fs');
var moduleSource = require('./moduleSource');
var assemble = require('./assemble');

responsive();

function responsive () {
	var getSource, dest, template, files, output;

	getSource = moduleSource(require.resolve, fs.readFileSync);

	dest = 'rave.js';

	template = '../src/_template';

	files = {
		promise: 'when/es6-shim/Promise',
		loader: 'es6-module-loader/lib/es6-module-loader',
		rave: '../src/rave',
		hooks: './temp/hooks',
		modules: null
	};

	output = assemble(getSource, template, files);

	fs.writeFileSync(dest, output);

	console.log('Built file written to ' + dest);
}
