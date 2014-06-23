/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = findAmdEvidence;

var createCodeFinder = require('./createCodeFinder');

var findAmdEvidenceRx = /(\bdefine\s*\()|(\bdefine\.amd\b)/g;

var finder = createCodeFinder(findAmdEvidenceRx);

function findAmdEvidence (source) {
	var isAmd = false;

	finder(source, function () {
		isAmd = true;
		return false; // stop searching
	});

	return { isAmd: isAmd };
}
