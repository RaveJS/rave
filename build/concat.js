/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var fs = require('fs');

module.exports = concat;

function concat (dest, modules) {

	var promise, eml, template, hooks, rave, built;

	promise = fs.readFileSync(require.resolve('when/es6-shim/Promise'));
	eml = fs.readFileSync(require.resolve('es6-module-loader/lib/es6-module-loader'));
	template = fs.readFileSync(require.resolve('../src/_template'));
	hooks = fs.readFileSync(require.resolve('./temp/hooks'));
	rave = fs.readFileSync(require.resolve('../src/rave'));

	hooks = removeLicenses(String(hooks));
	rave = removeLicenses(String(rave));

	built = String(template)
		.replace(/\/\*===promise===\*\//, promise)
		.replace(/\/\*===loader===\*\//, eml)
		.replace(/\/\*===rave===\*\//, rave)
		.replace(/\/\*===hooks===\*\//, hooks)
		.replace(/\/\*===modules===\*\//, modules || '');

	fs.writeFileSync(dest, built);

	console.log('Built file written to ' + dest);
}

function removeLicenses (str) {
	return str
		.replace(/\/\*\* @author.*?\*\/\s*\n?/g, '')
		.replace(/\/\*\* @license.*?\*\/\s*\n?/g, '');
}
