var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createRequire = require('../../lib/createRequire');

buster.testCase('createRequire', {

	'should create a require function': function () {
		var r = createRequire({}, 'foo');
		assert.isFunction(r);
		assert('async' in r, 'require.async');
		assert('named' in r, 'require.named');
		assert.same(r.length, 1, 'require arity === 1');
		assert.same(r.named.length, 2, 'require.named arity === 2');
		assert.same(r.async.length, 1, 'require.async arity === 1');
	},

	'should attempt to resolve a module sync': function () {
		var loader = loaderStub.call(this);
		var r = createRequire(loader, 'foo');
		r('bar');
		assert.calledWithExactly(loader.normalize, 'bar', 'foo');
		assert.calledWithExactly(loader.get, 'bar');
	},

	'should attempt to resolve named exports of a module sync': function () {
		var loader = loaderStub.call(this);
		var r = createRequire(loader, 'foo');
		var exports = r.named('bar', ['a', 'b']);
		assert('b' in exports, 'got named export "b"');
		assert('a' in exports, 'got named export "a"');
		refute('c' in exports, 'got named export "c"');
	},

	'should attempt to resolve a module async': function () {
		var loader = loaderStub.call(this);
		var r = createRequire(loader, 'foo');
		r.async('bar');
		assert.calledWithExactly(loader.normalize, 'bar', 'foo');
		assert.calledWithExactly(loader.import, 'bar');
	},

	'should attempt to resolve named exports of a module async': function () {
		var loader = loaderStub.call(this);
		var r = createRequire(loader, 'foo');
		var exports = r.async('bar', ['a', 'b']);
		assert('b' in exports, 'got named export "b"');
		assert('a' in exports, 'got named export "a"');
		refute('c' in exports, 'got named export "c"');
	}

});

function loaderStub () {
	return {
		normalize: this.spy(function (id) { return id; }),
		import: this.spy(thenable),
		get: this.spy(fooModule)
	};
	function thenable () {
		return {
			then: function (onFulfilled) {
				return onFulfilled(fooModule());
			}
		};
	}
	function fooModule () { return { a: 1, b: 1, c: 1 } }
}
