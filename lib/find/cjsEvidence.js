/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = findCjsEvidence;

var createCodeFinder = require('./createCodeFinder');

findCjsEvidence.rx = /(\btypeof\s+exports\b|\bmodule\.exports\b|\bexports\.\b|\brequire\s*\(\s*["'][^"']*["']\s*\))/g;

var finder = createCodeFinder(findCjsEvidence.rx);

function findCjsEvidence (source) {
	var isCjs = false;

	finder(source, function () {
		isCjs = true;
		return source.length; // stop searching
	});

	return { isCjs: isCjs };
}
