var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createNormalizer = require('../../lib/createNormalizer');

buster.testCase('createNormalizer', {

	'should create a function that calls its arguments': function () {
		var arg1 = this.spy(),
			arg2 = this.spy(function () { return 'd'; });
		var func = createNormalizer(arg1, arg2);
		func('a', 'b', 'c');
		assert.alwaysCalledWithExactly(arg2, 'a', 'b', 'c');
		assert.alwaysCalledWithExactly(arg1, 'd', 'b', 'c');
	}

});
