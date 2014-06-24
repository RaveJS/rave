/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createCodeFinder;

// Export private functions for testing
createCodeFinder.composeRx = composeRx;
createCodeFinder.rxStringContents = rxStringContents;
createCodeFinder.skipTo = skipTo;

// Look for code transitions. strings (that aren't blank), comments, RegExps
var codeTransitionsRx = /('(?!')|"(?!")|\/\/|\/\*)/g;
var trimRegExpRx = /^\/|\/[gim]*$/g;

// RegExps to find end of strings, comments, RegExps in code
// The string RegExps can't detect blank strings, so we filter those in advance.
var skippers = {
	"'": /\\\\'|[^\\]'/g,
	'"': /\\\\"|[^\\]"/g,
	'//': /\n|$/g,
	'/*': /\*\//g
};

/**
 * Creates a function that will call a callback function with a set of matches
 * for each occurrence of a pattern match for a given RegExp.  Only true
 * JavaScript is searched.  Comments, strings, and (TODO) RegExps are skipped.
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
		var matches, index, trans;

		comboRx.lastIndex = 0; // reset

		while (matches = comboRx.exec(source)) {

			index = comboRx.lastIndex;
			trans = matches.pop();

			// if transition patterns not found, this must be a user pattern
			if (!trans) {
				// call onMatch and let it optionally skip forward
				index = onMatch(matches) || index;
			}
			// check for transitions into quotes, comments
			else if (trans in skippers) {
				// skip over them
				index = skipTo(source, skippers[trans], index);
			}

			comboRx.lastIndex = index;
		}

		return source;
	};
}

function skipTo (source, rx, index) {
	rx.lastIndex = index;
	var matches = rx.exec(source);
	if (!matches) {
		throw new Error(
				'Unterminated comment, string, or RegExp at '
				+ index + ' near ' + source.slice(index - 50, 100)
		);
	}
	return rx.lastIndex;
}

function composeRx (rx1, rx2, flags) {
	return new RegExp(rxStringContents(rx1) + '|' + rxStringContents(rx2), flags);
}

function rxStringContents (rx) {
	return rx.toString().replace(trimRegExpRx, '');
}
