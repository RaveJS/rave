/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = merge;

var tokenRx = /\/\*===([a-zA-Z$_][a-zA-Z$_0-9]*)===\*\//g;

function merge (template, values) {
	return String(template)
		.replace(tokenRx, function (m, token) {
			if (!token in values) {
				throw new Error(token + ' not found in template.');
			}
			return values[token];
		});
}
