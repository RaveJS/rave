var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var captureAmdArgs = require('../../lib/captureAmdDefines');

var nameOptions = { '': 1, 'name': 1 };
var depCounts = { 'none': 1, 0: 1, 1: 1, 3: 1 };
var factoryOptions = { '""': 1, '{}': 1, 'function () {}': 1 };
var depsList = [ 'dep1', 'dep2', 'dep3' ];

buster.testCase('captureAmdDefines', {

	'should not fail on many variations of define()': function () {
		for (var name in nameOptions) {
			for (var depCount in depCounts) {
				for (var factory in factoryOptions) {
					var deps = depCount == 'none'
						? null
						: depsList.slice(0, depCount);
					var def = generateDefine(name, deps, factory);
					refute.exception(function () {
						captureAmdArgs(def);
					});
				}
			}
		}
	},

	'should always return a factory': function () {
		var def;
		def = generateDefine(null, null, '{}');
		assert.isFunction(captureAmdArgs(def).anon.factory, 'factory is object');
		def = generateDefine(null, null, '"foo"');
		assert.isFunction(captureAmdArgs(def).anon.factory, 'factory is string');
		def = generateDefine(null, null, '/foo/g');
		assert.isFunction(captureAmdArgs(def).anon.factory, 'factory is RegExp');
	},

	'should detect a named module': function () {
		var def;
		def = generateDefine('foo', null, '{}');
		assert.equals('foo', captureAmdArgs(def).named[0].name);
	},

	'should detect dependencies': function () {
		var def;
		def = generateDefine('foo', ['bar', 'baz'], '{}');
		assert.equals(['bar', 'baz'], captureAmdArgs(def).named[0].depsList, 'named module');
		def = generateDefine(null, ['bar', 'baz'], '{}');
		assert.equals(['bar', 'baz'], captureAmdArgs(def).anon.depsList, 'anonymous module');
	}

});

function generateDefine (name, deps, factory) {
	var args = [];
	if (name) args.push(quoted(name));
	if (deps) args.push('[' + deps.map(quoted) + ']');
	args.push(factory);
	return 'define(' + args.join(', ') + ');';
}

function quoted (val) {
	return "'" + val + "'";
}
