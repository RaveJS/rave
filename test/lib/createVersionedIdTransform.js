var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createVersionedIdTransform = require('../../lib/createVersionedIdTransform');

buster.testCase('createVersionedIdTransform', {

	'should create a function': function () {
		var xform = createVersionedIdTransform({});
		assert.isFunction (xform);
	},

	'// should have more tests': function () {}

});
