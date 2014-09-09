/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var fs = require('fs');

var promise, eml, template, hooks, rave, built;

promise = fs.readFileSync('./node_modules/when/es6-shim/Promise.js');
eml = fs.readFileSync('./node_modules/es6-module-loader/lib/es6-module-loader.js');
template = fs.readFileSync('./src/_template.js');
hooks = fs.readFileSync('./build/temp/hooks.js');
rave = fs.readFileSync('./src/rave.js');

hooks = removeLicenses(String(hooks));
rave = removeLicenses(String(rave));

built = String(template)
	.replace(/\/\*===promise===\*\//, promise)
	.replace(/\/\*===loader===\*\//, eml)
	.replace(/\/\*===rave===\*\//, rave)
	.replace(/\/\*===hooks===\*\//, hooks);

fs.writeFileSync('rave.js', built);

console.log('Built file written to rave.js');

function removeLicenses (str) {
	return str
		.replace(/\/\*\* @author.*?\*\/\s*\n?/g, '')
		.replace(/\/\*\* @license.*?\*\/\s*\n?/g, '');
}
