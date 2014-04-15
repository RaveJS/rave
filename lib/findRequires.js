/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = findRequires;

var findRValueRequiresRx;

findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|(\\["'])|(["'])|(\/\/|\/\*)|(\n|\*\/)/g;

function findRequires (source) {
	var deps, seen, quote, comment;

	deps = [];
	seen = {};

	// look for require() (ouside of quotes and comments)
	source.replace(findRValueRequiresRx, function (m, rq, id, escq, qq, sc, ec) {
		if (comment) {
			if (ec === comment) comment = false;
		}
		else if (quote) {
			if (qq === quote) quote = false;
		}
		else if (qq) {
			quote = qq;
		}
		else if (sc) {
			comment = sc === '//' ? '\n' : '*/';
		}
		else if (id) {
			// push [relative] id into deps list and seen map
			if (!(id in seen)) {
				seen[id] = true;
				deps.push(id)
			}
		}
		return ''; // uses least RAM/CPU
	});
	return deps;
}
