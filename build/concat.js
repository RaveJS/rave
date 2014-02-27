/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var fs = require('fs');

var template, eml, emlPatch, browser, rave, built;

template = fs.readFileSync('./src/_template.js');
eml = fs.readFileSync('./node_modules/es6-module-loader/lib/es6-module-loader.js');
emlPatch = fs.readFileSync('./src/patches.js');
browser = fs.readFileSync('./build/temp/browser.js');
rave = fs.readFileSync('./src/rave.js');

browser = removeLicenses(String(browser));
rave = removeLicenses(String(rave));

built = String(template)
	.replace(/\/\*===loader===\*\//, eml)
	.replace(/\/\*===patches===\*\//, emlPatch)
	.replace(/\/\*===rave===\*\//, rave)
	.replace(/\/\*===browser===\*\//, browser);

fs.writeFileSync('rave.js', built);

console.log('Built file written to rave.js');

function removeLicenses (str) {
	return str
		.replace(/\/\*\* @author.*?\*\/\s*\n?/g, '')
		.replace(/\/\*\* @license.*?\*\/\s*\n?/g, '');
}
