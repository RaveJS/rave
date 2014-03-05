var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var beget = require('../../lib/beget');

buster.testCase('beget', {

	'should inherit from a base object': function () {
		var parent = {
			prop: 42
		};
		var child = beget(parent);
		child.own = 27;
		refute.same(child, parent, 'objects are not the same');
		assert.same(child.prop, parent.prop, 'child inherits parent property');
		refute('own' in parent, 'parent inherited child property');
		refute('prop' in beget({}), 'prototype is reset each time');
	}

});
