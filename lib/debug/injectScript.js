/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = injectScript;

var injectSource = function (el, source) {
	// got this sniff from Stoyan Stefanov
	// (http://www.phpied.com/dynamic-script-and-style-elements-in-ie/)
	injectSource = 'text' in el ? setText : appendChild;
	injectSource(el, source);
};

var doc = document;
var head = doc && (doc['head'] || doc.getElementsByTagName('head')[0]);
var insertBeforeEl = head && head.getElementsByTagName('base')[0] || null;

function injectScript (source) {
	var el = doc.createElement('script');
	injectSource(el, source);
	el.charset = 'utf-8';
	head.insertBefore(el, insertBeforeEl);
	head.removeChild(el);
}

function setText (el, source) {
	el.text = source;
}

function appendChild (el, source) {
	el.appendChild(doc.createTextNode(source));
}
