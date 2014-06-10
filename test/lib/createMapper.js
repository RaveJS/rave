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
		var normalize = this.spy(fakeNormalize);
		var packages = {'a': {map: {'./some/path': './foo.js'}}};
		var map = createMapper({packages: packages}, normalize);
		assert.equals(map(normalize('./some/path.js', 'a'), 'a'), 'a#./FOO');
	},

	'should replace the module id with rave/lib/blank if it is mapped to false': function () {
		var normalize = this.spy(fakeNormalize);
		var packages = {'a': {map: {'./some/path': false}}};
		var map = createMapper({packages: packages}, normalize);
		assert.equals(map(normalize('./some/path.js', 'a'), 'a'), 'rave/lib/blank');
	}

});

// we want to make sure the normalize function is used in the right places
// so create a fake normalizer that incorporates the args into the return value
// as well as does some processing to the module id
function fakeNormalize(id, refUid) {
	return refUid + '#' + id.toUpperCase().replace(".JS", "");
}
