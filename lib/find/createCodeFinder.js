/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = createCodeFinder;

// exports private functions for testing
createCodeFinder.checkStateChange = checkStateChange;
createCodeFinder.composeRx = composeRx;
createCodeFinder.rxStringContents = rxStringContents;

// regexps used herein
var codeTransitionsRx = /(\\["'])|(["'])|(\/\/|\/\*)|(\n|\*\/)/g;
var trimRegExpRx = /^\/|\/[gim]*$/g;

// positions of code transition regexp matches in codeTransitionsRx
var spliceStart = -4, spliceCount = 4;
// position of transitions spliced out of matches
var escq = 0, qq = 1, sc = 2, ec = 3;

/**
 * Creates a function that will call a callback function with a set of matches
 * for for each occurrence of a pattern match for a given RegExp.  Only true
 * JavaScript is searched.  Comments, strings, and (TODO) RegExps are skipped.
 * The callback is called with a single parameter: an array containing the
 * result of calling the RegExp's exec() method.
 * @param {RegExp} codeRx is a RegExp for the code pattern to find.
 * @returns {function(source:string, callback:function)}
 */
function createCodeFinder (codeRx) {
	var flags, comboRx;

	flags = codeRx.multiline ? 'gm' : 'g'; // we probably don't need ignoreCase
	comboRx = composeRx(codeRx, codeTransitionsRx, flags);

	return function (source, callback) {
		var state, matches, transitions;

		state = {};

		while (matches = comboRx.exec(source)) {
			// remove code transition matches
			transitions = matches.splice(spliceStart, spliceCount);
			// check state
			state = checkStateChange(state, transitions);
			// if we're in source code, this was a match on codeRx
			if (state.inUserMatch) {
				callback(matches);
			}
		}

		return source;
	};
}

function checkStateChange (state, transitions) {
	state.inUserMatch = false;
	if (state.inComment) {
		if (transitions[ec] === state.inComment) {
			state.inComment = false;
		}
	}
	else if (state.inQuote) {
		if (transitions[qq] === state.inQuote) {
			state.inQuote = false;
		}
	}
	else {
		if (transitions[qq]) {
			state.inQuote = transitions[qq];
		}
		else if (transitions[sc]) {
			state.inComment = transitions[sc] === '//' ? '\n' : '*/';
		}
		else if (!transitions[ec] && !transitions[escq]) {
			state.inUserMatch = true;
		}
	}
	return state;
}

function composeRx (rx1, rx2, flags) {
	return new RegExp(rxStringContents(rx1) + '|' + rxStringContents(rx2), flags);
}

function rxStringContents (rx) {
	return rx.toString().replace(trimRegExpRx, '');
}
