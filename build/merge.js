/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = merge;

merge.throwIfMissing = throwIfMissing;
merge.preserveToken = preserveToken;

var tokenRx = /\/\*===([a-zA-Z$_][a-zA-Z$_0-9]*)===\*\//g;

function merge (template, values, getter) {
	if (!getter) getter = throwIfMissing;
	return String(template)
		.replace(tokenRx, function (m, token) {
			if (!token in values) {
				throw new Error(token + ' not found in template.');
			}
			return getter(values, token);
		});
}

function throwIfMissing (values, key) {
	if (!(key in values)) throw new Error(key + ' not found in values.');
	return values[key];
}


function preserveToken (values, key) {
	return key in values ? values[key] : '/*===' + key + '===*/';
}
