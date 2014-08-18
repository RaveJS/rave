var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

require('when/es6-shim/Promise');
var common = require('../../../lib/crawl/common');

buster.testCase('lib/crawl/common', {

	crawl: {
		'//should be tested': function () {
			assert(false);
		}
	},

	load: {
		'//should be tested': function () {
			assert(false);
		}
	},

	store: {
		'should return a function that adds a property to context': function () {
			var store = common.store;
			var context = {}, value = {};
			store('foo')(context, value);
			assert.same(value, context.foo);
		}
	},

	childIterator: {
		'should map a set of names onto a childCrawler method and return a Promise for all': function () {
			var childIterator = common.childIterator;
			var context = { childCrawler: this.spy(identity) };
			var names = ['moe', 'larry', 'curly'];
			return childIterator(context, names).then(function (result) {
				assert.equals(names, result);
			});
		}
	},

	collectMetadata: {
		'should push the value onto the context.all array': function () {
			var collectMetadata = common.collectMetadata;
			var context = { all: [] };
			assert.same(context.all.length, 0, 'context.all length is 0');
			collectMetadata(context, 1);
			assert.same(context.all.length, 1, 'context.all length is 1');
			assert.same(context.all[0], 1);
			collectMetadata(context, 2);
			assert.same(context.all.length, 2, 'context.all length is 2');
			assert.same(context.all[1], 2);
		}
	},

	collectOverrides: {
		'should add the overrides and missing properties onto context': function () {
			var collectOverrides = common.collectOverrides;
			var context = { overrides: {}, missing: {} };
			var data = {
				rave: {
					overrides: { foo: 1 },
					missing: { bar: 1 }
				}
			};
			collectOverrides(context, data);
			assert('foo' in context.overrides, 'item is in context.overrides');
			assert('bar' in context.missing, 'item is in context.missing');
		}
	},

	applyOverrides: {
		'//should be tested': function () {
			assert(false);
		}
	},

	start: {
		'should return a function that returns a promise for a tuple of the result of the injected function': function () {
			var start = common.start;
			var func = this.spy(x2);
			var context = {}, value = 5;
			return start(func)(context, value).then(function (tuple) {
				assert.same(tuple[0], context);
				assert.same(tuple[1], value * 2);
				assert.calledOnce(func);
			});
		}
	},

	proceed: {
		'should return a function that returns a promise for thr result of the injected function': function () {
			var proceed = common.proceed;
			var func = this.spy(x2);
			var context = {}, value = 5;
			assert.isFunction(proceed(func));
			return proceed(func)([context, value]).then(function (tuple) {
				assert.same(tuple[0], context);
				assert.same(tuple[1], value * 2);
				assert.calledOnce(func);
			});
		}
	},

	end: {
		'should return last item in tuple': function () {
			var tuple = [{}, {}];
			assert.same(tuple[1], common.end(tuple));
		}
	}

});

function x2 (context, value) {
	return value * 2;
}

function identity (context, value) {
	return value;
}
