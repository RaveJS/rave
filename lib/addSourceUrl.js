/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = addSourceUrl;

function addSourceUrl (url, source) {
	return source
		+ '\n//# sourceURL='
		// TODO: Safari 6 and 7 fail to recognize sourceURL when it has a port
		+ encodeURI(url)
		+ '\n';
}
