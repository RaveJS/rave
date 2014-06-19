var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createPackageMapper = require('../../lib/createPackageMapper');

buster.testCase('createPackageMapper', {

	'should create a function': function () {
		var map = createPackageMapper({});
		assert.isFunction(map);
	},

	'should handle mapping uids': function () {
		var packages = {'foo': {map: {'foo/some/path': 'foo/browser'}}};
		var map = createPackageMapper({packages: packages});
		assert.equals(map('foo@1.0.0#foo/some/path', 'foo'), 'foo/browser');
	},

	'should handle mapping module names': function () {
		var packages = {'foo': {map: {'foo/some/path': 'foo/browser'}}};
		var map = createPackageMapper({packages: packages});
		assert.equals(map('foo/some/path', 'foo'), 'foo/browser');
	}

});
