var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

var createCodeFinder = require('../../../lib/find/createCodeFinder');

var testSource = 'module.exports = function foo () { /* alert("moo"); */ alert("foo"); alert("bar"); }';

buster.testCase('lib/find/createCodeFinder', {

	'createCodeFinder': {
		'should create a function': function () {
			assert.isFunction(createCodeFinder(/ /));
		},
		'should find a simple code snippet': function () {
			var finder = createCodeFinder(/alert/);
			var count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 2);
		},
		'should ignore text inside strings and comments': function () {
			var finder = createCodeFinder(/bar/);
			var count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 0, 'bar');
			finder = createCodeFinder(/foo/);
			count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 1, 'foo');
			finder = createCodeFinder(/moo/);
			count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 0, 'foo');
		},
		'// should ignore text inside RegExps': function () {
			// TODO
		},
		'should find a code snippet with a string, if requested': function () {
			var finder = createCodeFinder(/alert\("foo"\);/);
			var count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 1, 'alert("foo");');
		},
		'should skip over escaped quotes': function () {
			var finder = createCodeFinder(/possibly/);
			var str = "alert('this can\\'t possibly work');";
			var count = 0;
			finder(str, function () { count++; });
			assert.same(count, 0);
		},
		'should throw when a string or comment is unterminated': function () {
			var str, finder;
			finder = createCodeFinder(/foo/);
			str = 'bar(); /* here is a comment\n\n';
			assert.exception(function () {
				finder(str, function () {});
			});
			str = 'var bar = " here is a string\n\n';
			assert.exception(function () {
				finder(str, function () {});
			});
		}
	},

	'skipTo': {
		'should skip past the given string': function () {
			var str = 'foo bar foo';
			var pos = createCodeFinder.skipTo(str, /foo/g, 0);
			assert.same(pos, 3, 'from start of string');
			pos = createCodeFinder.skipTo(str, /foo/g, 3);
			assert.same(pos, 11, 'from middle of string');
		},
		'should throw when a pattern isn\'t found': function () {
			var str;
			assert.exception(function () {
				str = 'this is a string';
				createCodeFinder.skipTo(str, /foo/g, 0);
			});
		}
	},

	composeRx: {
		'should compose two RegExps together': function () {
			var combo = createCodeFinder.composeRx(/foo/, /bar/, 'g');
			assert.same(combo.toString(), '/foo|bar/g');
		},
		'should add flags to resulting RegExp': function () {
			var combo = createCodeFinder.composeRx(/foo/, /bar/, 'gim');
			assert.same(combo.toString().slice(-3), 'gim');
		}
	},

	rxStringContents: {
		'should remove only leading and trailing slashes from a RegExp.totring()': function () {
			var rx = /foo\/bar/;
			assert.same(createCodeFinder.rxStringContents(rx), 'foo\\/bar');
		},
		'should remove trailing options RegExp.totring()': function () {
			var rx = /foo|bar/gim;
			assert.same(createCodeFinder.rxStringContents(rx), 'foo|bar');
		}
	}

});
