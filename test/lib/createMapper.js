var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createMapper = require('../../lib/createMapper');

buster.testCase('createMapper', {

	'should create a function': function () {
		var map = createMapper({});
		assert.isFunction(map);
	},

	map: {
		'should not change the module id if there is no map': function () {
			var packages = {'foo': {}};
			var map = createMapper({packages: packages});
			assert.equals(map('./some/path.js', 'foo'), './some/path.js');
		},

		'should not change the module id if it is not in the map': function () {
			var packages = {'foo': {map: {'./some/other/path': './foo'}}};
			var map = createMapper({packages: packages});
			assert.equals(map('./some/path.js', 'foo'), './some/path.js');
		},

		'should replace the module id if it is in the map': function () {
			var packages = {'foo': {map: {'foo/some/path': 'foo/browser'}}};
			var map = createMapper({packages: packages});
			assert.equals(map('foo/some/path', 'foo'), 'foo/browser');
		},

		'should replace the module id with rave/lib/blank if it is mapped to false': function () {
			var packages = {'foo': {map: {'bar': false}}};
			var map = createMapper({packages: packages});
			assert.equals(map('bar', 'foo'), 'rave/lib/blank');
		}
	},

	mapFunc: {
		'should not change the module id if there is no mapFunc': function () {
			var packages = {'foo': {}};
			var map = createMapper({packages: packages});
			assert.equals(map('./some/path.js', 'foo'), './some/path.js');
		},

		'should not change the module id if mapFunc returns undefined': function () {
			var packages = {'foo': {mapFunc: function () {}}};
			var map = createMapper({packages: packages});
			assert.equals(map('./some/path.js', 'foo'), './some/path.js');
		},

		'should replace the module id if mapfunc returns a string': function () {
			var packages = {'foo': {mapFunc: function () { return 'foo/browser'; }}};
			var map = createMapper({packages: packages});
			assert.equals(map('foo/some/path', 'foo'), 'foo/browser');
		},

		'should replace the module id with rave/lib/blank if mapFunc returns false': function () {
			var packages = {'foo': {mapFunc: function () { return false; }}};
			var map = createMapper({packages: packages});
			assert.equals(map('bar', 'foo'), 'rave/lib/blank');
		}
	}

});
