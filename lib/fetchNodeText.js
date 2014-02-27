/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = fetchNodeText;

// we're using parens to hide `require` from cram.js
var fs = (require)('fs');
var url = (require)('url');
var http = (require)('http');

var protocol = 'http:';
var hasHttpProtocolRx = /^https?:/;
var needsProtocolRx = /^\/\//;

function fetchNodeText (urlOrPath, success, fail) {
	if (needsProtocolRx.test(urlOrPath)) {
		// if there's no protocol, use configured protocol
		// TODO: make protocol configurable
		urlOrPath = protocol + urlOrPath;
	}
	if (hasHttpProtocolRx.test(urlOrPath)) {
		loadFileViaNodeHttp(urlOrPath, success, fail);
	}
	else {
		loadLocalFile(urlOrPath, success, fail);
	}
}

function loadLocalFile (uri, success, fail) {
	fs.readFile(uri, function (ex, contents) {
		if (ex) fail(ex);
		else success(String(contents));
	});
}

function loadFileViaNodeHttp (uri, success, fail) {
	var options, data;
	options = url.parse(uri, false, true);
	data = '';
	http.get(options, function (response) {
		response
			.on('data', function (chunk) { data += chunk; })
			.on('end', function () { success(data); })
			.on('error', fail);
	}).on('error', fail);
}
