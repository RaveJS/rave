/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var assemble = require('./assemble');

responsive();

function responsive () {
	var dest, template, files;

	dest = 'rave.js';

	template = '../src/_template';

	files = {
		promise: 'when/es6-shim/Promise',
		loader: 'es6-module-loader/lib/es6-module-loader',
		rave: '../src/rave',
		hooks: './temp/hooks',
		modules: null
	};

	assemble(require.resolve, template, dest, files);

	console.log('Built file written to ' + dest);
}
