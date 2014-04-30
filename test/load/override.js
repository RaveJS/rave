var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var override = require('../../load/override');

var originals = {
	normalize: function () {},
	locate: function () {},
	fetch: function () {},
	translate: function () {},
	instantiate: function () {}
};

var overrides = [
	{
		predicate: function () {},
		hooks: {
			normalize: function () {},
			locate: function () {}
		}
	},
	{
		predicate: function () {},
		hooks: {
			normalize: function () {},
			locate: function () {},
			fetch: function () {}
		}
	},
	{
		predicate: function () {},
		hooks: {
			instantiate: function () {}
		}
	}
];

buster.testCase('override', {

	'hooks': {
		'should create override hooks for only hooks that are specified in overrides': function () {
			var overs = overrides.reduce(function (overs, override) {
				overs.push({
					predicate: function () {},
					hooks: clone(override.hooks)
				});
				return overs;
			}, []);
			var orig = clone(originals);
			var hooks = override.hooks(orig, overs);
			refute.same(orig.normalize, hooks.normalize);
			refute.same(orig.locate, hooks.locate);
			refute.same(orig.fetch, hooks.fetch);
			assert.same(orig.translate, hooks.translate);
			refute.same(orig.instantiate, hooks.instantiate);
		}
	},

	'hook': {
		'should create an overridden loader hook': function () {
			var orig, over, hook;

			// create stubs
			orig = clone(originals);
			orig.locate = this.spy();
			over = [clone(overrides[0])];
			over[0].hooks = clone(over.hooks);
			over[0].hooks.normalize = this.spy();
			over[0].hooks.locate = this.spy();
			over[0].predicate = this.spy(always);

			// create
			hook = override.hook('locate', orig.locate, over);
			assert.isFunction(hook);

			// exec and override
			hook();
			refute.called(orig.locate, 'original hook');
			refute.called(over[0].hooks.normalize, 'hook override');
			assert.called(over[0].hooks.locate, 'hook override');
			assert.called(over[0].predicate, 'predicate');

			// exec and don't override
			orig.locate = this.spy();
			over[0].hooks.locate = this.spy();
			over[0].predicate = this.spy(never);
			hook = override.hook('locate', orig.locate, over);
			hook();
			assert.called(orig.locate, 'original hook');
			refute.called(over[0].hooks.normalize, 'hook override');
			refute.called(over[0].hooks.locate, 'hook override');
			assert.called(over[0].predicate, 'predicate');

			// other checks
			hook = override.hook('does not exist', originals.locate, overrides);
			assert.same(originals.locate, hook, 'preserved original hook if no overrides apply');

		}
	},

	'sortByPredicate': {
		'should sort higher specificity filters before lower': function () {
			// this should be enough since we test specificity thoroughly
			var filter0 = { package: 'foo' };
			var filter1 = { pattern: '^foo$' };
			var filter2 = { extensions: [ 'foo' ] };
			var sorted = override.sortByPredicate([ filter2, filter1, filter0 ]);
			assert.same(sorted[0], filter0);
			assert.same(sorted[1], filter1);
			assert.same(sorted[2], filter2);
		}
	},

	'toFastOverride': {
		'should assign a predicate property': function () {
			var filter1 = override.toFastOverride({});
			assert.isFunction(filter1.predicate);
		},
		'// should supply a samePackage function, if missing': function () {
			// TODO: how to test this?
			assert(false);
		}
	},

	'callHook': {
		'should create a function that calls the predicate, then hook if predicate returns truthy': function () {
			var predicate = this.spy(always);
			var hook = this.spy();
			var defaultValue = {};
			var func = override.callHook(predicate, hook, defaultValue);
			assert.isFunction(func);
			func();
			assert.callOrder(predicate, hook);
		},
		'should create a function that calls the predicate, but not hook if predicate returns falsey': function () {
			var predicate = this.spy();
			var hook = this.spy();
			var defaultValue = {};
			var func = override.callHook(predicate, hook, defaultValue);
			assert.isFunction(func);
			func();
			assert.called(predicate);
			refute.called(hook);
		},
		'should return a default value if predicate returns falsey': function () {
			var predicate = this.spy();
			var hook = this.spy();
			var defaultValue = {};
			var func = override.callHook(predicate, hook, defaultValue);
			assert.isFunction(func);
			var result = func();
			assert.equals(result, defaultValue);
		}
	},

	'callNormalize': {
		'should create a function that calls normalize, then the predicate': function () {
			var predicate = this.spy();
			var normalize = this.spy(function () { return 'foo'; });
			var defaultValue = {};
			var func = override.callNormalize(predicate, normalize, defaultValue);
			assert.isFunction(func);
			func();
			assert.callOrder(normalize, predicate);
			assert.calledWith(predicate, { name: 'foo' });
		},
		'should return a default value if predicate returns falsey': function () {
			var predicate = this.spy();
			var normalize = this.spy();
			var defaultValue = {};
			var func = override.callNormalize(predicate, normalize, defaultValue);
			assert.isFunction(func);
			var result = func();
			assert.equals(result, defaultValue);
		}
	},

	'packageMatch': {
		'should return true if same package name': function () {
			assert(override.packageMatch('foo/bar', 'foo/baz'));
			assert(override.packageMatch('foo@0.3.4#foo/bar', 'foo/baz'));
			refute(override.packageMatch('foo/bar', 'boo/baz'));
		}
	}

});

function clone (obj) {
	var copy = {};
	for (var p in obj) copy[p] = obj[p];
	return copy;
}

function always () { return true; }

function never () { return false; }
