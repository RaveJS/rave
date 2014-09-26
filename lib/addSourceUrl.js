/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = addSourceUrl;

function addSourceUrl (url, source) {
	var safeUrl = stripPort(url);
	return source
		+ '\n//# sourceURL='
		+ encodeURI(safeUrl)
		+ '\n';
}

function stripPort (url) {
	var u;
	// Until Safari fixes their debugger or we have a reliable way to sniff for
	// the broken debugger, we'll have to sniff the user agent.  Note: this
	// sniff happens in debugging code only, not in production code.
	if (typeof URL !== 'undefined' && isSafari()) {
		u = new URL(url);
	}
	return u && u.port
		? u.protocol + '//'
			+ u.hostname
			// yes, this is crazy. Safari, what gives????
			+ (u.port ? ':' + u.port + '/.' : '')
			+ u.pathname
			+ u.search
			+ u.hash
		: url;
}

function isSafari () {
	var ua = navigator.userAgent;
	return ua.indexOf('Safari') >= 0 && ua.indexOf('Chrome') < 0;
}
