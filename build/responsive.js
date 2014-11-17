/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var build = require('./build');
var fs = require('fs');

var dest = 'rave.js';

build(null, null).then(write).then(log);

function write (output) {
	fs.writeFile(dest, output);
}

function log () {
	console.log('Built file written to ' + dest);
}
