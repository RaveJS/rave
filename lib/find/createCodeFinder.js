/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createCodeFinder;

// Export private functions for testing
createCodeFinder.composeRx = composeRx;
createCodeFinder.rxStringContents = rxStringContents;
createCodeFinder.skipTo = skipTo;

var trimRegExpRx = /^\/|\/[gim]*$/g;

// Look for code transitions.
var codeTransitionsRx = composeRx(
	// Detect strings, blank strings, and comments.
	/(''?|""?|\/\/|\/\*)/,
	// Detect RegExps by excluding division sign and line comment
	/(?:[\-+*\/=\,%&|^!(;\{\[<>]\s*)(\/)(?!\/)/,
	'g'
);

// RegExps to find end of strings, comments, RegExps in code
// We can't detect blank strings easily, so we handle those specifically.
var skippers = {
	"''": false,
	'""': false,
	"'": /\\\\'|[^\\]'/g,
	'"': /\\\\"|[^\\]"/g,
	'//': /\n|$/g,
	'/*': /\*\//g,
	'/': /\\\\\/|[^\\]\//g
};

/**
 * Creates a function that will call a callback function with a set of matches
 * for each occurrence of a pattern match for a given RegExp.  Only true
 * JavaScript is searched.  Comments, strings, and RegExps are skipped.
 * The onMatch callback is called with a single parameter: an array containing
 * the result of calling the RegExp's exec() method.  If onMatch returns a
 * very large number, the pattern matching stops.
 * @param {RegExp} codeRx is a RegExp for the code pattern to find.
 * @returns {function(source:string, onMatch:function):string}
 */
function createCodeFinder (codeRx) {
	var flags, comboRx;

	flags = codeRx.multiline ? 'gm' : 'g'; // we probably don't need ignoreCase
	comboRx = composeRx(codeRx, codeTransitionsRx, flags);

	return function (source, onMatch) {
		var matches, index, rx, trans;

		comboRx.lastIndex = 0; // reset

		while (matches = comboRx.exec(source)) {

			index = comboRx.lastIndex;

			// pop off matches for regexp and other transitions
			rx = matches.pop();
			trans = matches.pop() || rx;

			// if transition patterns not found, this must be a user pattern
			if (!trans) {
				// call onMatch and let it optionally skip forward
				index = onMatch(matches) || index;
			}
			// check for transitions into quotes, comments
			else if (trans in skippers) {
				// skip over them, possibly using a regexp to find the end
				if (skippers[trans]) {
					index = skipTo(source, skippers[trans], index);
				}
			}

			comboRx.lastIndex = index;
		}

		return source;
	};
}

function skipTo (source, rx, index) {
	rx.lastIndex = index;

	if (!rx.exec(source)) {
		throw new Error(
			'Unterminated comment, string, or RegExp at '
			+ index + ' near ' + source.slice(index - 50, 100)
		);
	}

	return rx.lastIndex;
}

function composeRx (rx1, rx2, flags) {
	return new RegExp(rxStringContents(rx1)
		+ '|' + rxStringContents(rx2), flags);
}

function rxStringContents (rx) {
	return rx.toString().replace(trimRegExpRx, '');
}
