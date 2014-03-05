var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var addSourceUrl = require('../../lib/addSourceUrl');

var sampleSource = "module.exports = sample;\n\nfunction sample (foo) {\n\treturn JSON.stringify(Object.keys(foo), null, '    ');\n}//end\n";
var afterAdded = addSourceUrl('http://foo.com/', sampleSource);

buster.testCase('addSourceUrl', {

	'should add //# sourceURL=<url>': function () {
		assert(afterAdded.match(/\/\/# sourceURL=http:\/\/foo\.com\//));
	},

	'should encode spaces in url': function () {
		var after = addSourceUrl('foo bar', sampleSource);
		assert(after.match(/foo%20bar/));
	},

	'should add //# sourceURL after source code': function () {
		var endOfSourceCode, startOfSourceUrl;
		endOfSourceCode = afterAdded.indexOf('//end') + '//end'.length;
		startOfSourceUrl = afterAdded.indexOf('//# sourceURL');
		assert(startOfSourceUrl > endOfSourceCode);
	}

});
