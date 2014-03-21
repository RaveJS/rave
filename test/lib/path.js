var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var path = require('../../lib/path');
var reduceLeadingDots = path.reduceLeadingDots;

buster.testCase('path', {

	'reduceLeadingDots': {
		'should normalize a sibling path of a module': function () {
			assert.equals('foo/bar', reduceLeadingDots('./bar', 'foo/baz'));
			assert.equals('more/foo/bar', reduceLeadingDots('./bar', 'more/foo/baz'));
			assert.equals('bar', reduceLeadingDots('./bar', ''));
			// this case is optional since it should never happen in CommonJS
			assert.equals('bar', reduceLeadingDots('./bar', 'baz'));
		},
		'should normalize a parent path of a module': function () {
			assert.equals('foo/bar', reduceLeadingDots('../bar', 'foo/baz/more'));
			assert.equals('foo', reduceLeadingDots('../foo', 'foo/baz'));
		},
		'should normalize a grandparent path of a module': function () {
			assert.equals('foo/bar', reduceLeadingDots('../../bar', 'foo/baz/more/win'));
			assert.equals('foo', reduceLeadingDots('../../foo', 'foo/baz/win'));
		},
		'should leave an absolute path unchanged': function () {
			assert.equals('foo/bar', reduceLeadingDots('foo/bar', 'foo'));
			assert.equals('foo/bar', reduceLeadingDots('foo/bar', 'foo/bar'));
			assert.equals('foo/bar', reduceLeadingDots('foo/bar', ''));
			assert.equals('foo', reduceLeadingDots('foo', ''));
		},
		'should resolve "directory" references': function () {
			assert.equals('foo', reduceLeadingDots('..', 'foo/bar'));
			assert.equals('foo', reduceLeadingDots('../..', 'foo/bar/baz'));
			// is there a valid use case for this?
			assert.equals('foo', reduceLeadingDots('.', 'foo'));
		},
		'should return original string if too many levels would be removed': function () {
			assert.equals('../../foo', reduceLeadingDots('../../foo', 'bar'));
		}
	},

	'//other things in path module': function () {
		assert(false);
	}

});
