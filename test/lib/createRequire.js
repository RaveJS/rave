var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var createRequire = require('../../lib/createRequire');

// overwrite node's Promise until it doesn't suck
global.Promise = require('when/es6-shim/Promise');

buster.testCase('createRequire', {

	'should create a require function': function () {
		var r = createRequire(this.spy(), this.spy());
		assert.isFunction(r);
		assert('async' in r, 'require.async');
		assert('named' in r, 'require.named');
		assert.same(r.length, 1, 'require arity === 1');
		assert.same(r.named.length, 2, 'require.named arity === 2');
		assert.same(r.async.length, 1, 'require.async arity === 1');
	},

	'should attempt to resolve a module sync': function () {
		var syncGet = this.spy();
		var asyncGet = this.spy(function () { return phonyPromise(); });
		var r = createRequire(syncGet, asyncGet);
		r('bar');
		assert.calledWithExactly(syncGet, 'bar');
		refute.called(asyncGet);
	},

	'should attempt to resolve named exports of a module sync': function () {
		var syncGet = this.spy(fooModule);
		var asyncGet = this.spy(function () { return Promise.resolve(); });
		var r = createRequire(syncGet, asyncGet);
		var exports = r.named('bar', ['a', 'b']);
		assert.called(syncGet);
		refute.called(asyncGet);
		assert('b' in exports, 'named export "b"');
		assert('a' in exports, 'named export "a"');
		refute('c' in exports, 'named export "c"');
	},

	'should attempt to resolve a module async': function () {
		var syncGet = this.spy();
		var asyncGet = this.spy(function () { return Promise.resolve(); });
		var r = createRequire(syncGet, asyncGet);
		r.async('bar');
		refute.called(syncGet);
		assert.calledWithExactly(asyncGet, 'bar');
	},

	'should attempt to resolve named exports of a module async': function (done) {
		var syncGet = this.spy(fooModule);
		var asyncGet = this.spy(function () { return Promise.resolve(fooModule()); });
		var r = createRequire(syncGet, asyncGet);
		r.async('bar', ['a', 'b']).then(function (exports) {
			refute.called(syncGet);
			assert.called(asyncGet);
			assert('b' in exports, 'named export "b"');
			assert('a' in exports, 'named export "a"');
			refute('c' in exports, 'named export "c"');
			done();
		});
	}

});

function fooModule () { return { a: 1, b: 1, c: 1 } }

function phonyPromise (value) {
	return {
		then: function (onFulfilled) {
			onFulfilled(value);
		},
		done: function () {}
	}
}
