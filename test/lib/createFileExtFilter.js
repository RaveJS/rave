var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createFileExtFilter = require('../../lib/createFileExtFilter');

buster.testCase('createFileExtFilter', {

	'should return true when file extension matches': function () {
		var filter = createFileExtFilter('txt');
		assert(filter('foo.txt'), '.txt extension');
		assert(filter('foo.txt.txt'), '.txt.txt extension');
		refute(filter('foo.bar'), '.bar extension');
		refute(filter('foo.txt.bar'), '.txt.bar extension');
		refute(filter('foo.txt/bar'), 'foo.txt/ folder');
		refute(filter('foo/bar'), 'no extension');
	},

	'should allow an csv string of file extensions': function () {
		var filter = createFileExtFilter('txt,html');
		assert(filter('foo.txt'), '.txt extension');
		assert(filter('foo.html'), '.html extension');
		refute(filter('foo.bar'), '.bar extension');
	},


	'should allow an array of file extensions': function () {
		var filter = createFileExtFilter(['txt', 'html']);
		assert(filter('foo.txt'), '.txt extension');
		assert(filter('foo.html'), '.html extension');
		refute(filter('foo.bar'), '.bar extension');
	},
	'should allow a hashmap of file extensions': function () {
		var filter = createFileExtFilter({'txt': 1, 'html': 1 });
		assert(filter('foo.txt'), '.txt extension');
		assert(filter('foo.html'), '.html extension');
		refute(filter('foo.bar'), '.bar extension');
	}

});
