var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createMapper = require('../../lib/createMapper');

buster.testCase('createMapper', {

	'should create a function': function () {
		var map = createMapper({}, function () {});
		assert.isFunction(map);
	},

	'should not change the module id if there is no map': function () {
		var packages = {'a': {}};
		var map = createMapper({packages: packages}, function () {});
		assert.equals(map('./some/path.js', 'a'), './some/path.js');
	},

	'should not change the module id if it is not in the map': function () {
		var packages = {'a': {map: {'./some/other/path': './foo'}}};
		var map = createMapper({packages: packages}, function () {});
		assert.equals(map('./some/path.js', 'a'), './some/path.js');
	},

	'should replace the module id if it is in the map': function () {
		var packages = {'a': {map: {'foo#foo/some/path': 'foo#foo/browser'}}};
		var map = createMapper({packages: packages});
		assert.equals(map('foo#foo/some/path', 'a'), 'foo#foo/browser');
	},

	'should replace the module id with rave/lib/blank if it is mapped to false': function () {
		var packages = {'a': {map: {'bar': false}}};
		var map = createMapper({packages: packages});
		assert.equals(map('bar', 'a'), 'rave/lib/blank');
	}

});
