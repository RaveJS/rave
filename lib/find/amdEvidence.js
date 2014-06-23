/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = findAmdEvidence;

var createCodeFinder = require('./createCodeFinder');

var findAmdEvidenceRx = /(\bdefine\s*\()|(\bdefine\.amd\b)/g;
var defineMatch = 1, defineSniff = 2;

var finder = createCodeFinder(findAmdEvidenceRx);

function findAmdEvidence (source) {
	var count, sniff;

	count = 0;
	sniff = false;

	finder(source, function (matches) {
		if (matches[defineMatch]) {
			count++;
		}
		else if (matches[defineSniff]) {
			sniff = true;
		}
	});

	return {
		isAmd: count > 0 || sniff,
		defineCount: count,
		defineSniff: !!sniff
	};
}
