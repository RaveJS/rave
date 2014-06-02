var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

var npm = require('../../../lib/metadata/npm');

buster.testCase('lib/metadata/npm', {

	createDescriptor: {
		'should append main dirname to location': function() {
			var npmTest = Object.create(npm, {
				pkgRoot: { value: 'existing/part' }
			});

			var dsc = npmTest.createDescriptor({
				main: 'deep/path/to/main.js'
			});

			assert.equals(dsc.location, 'existing/part/deep/path/to');
		},

		'should set main to main basename and remove file extension': function() {
			var dsc = npm.createDescriptor({
				main: 'deep/path/to/main.js'
			});

			assert.equals(dsc.main, 'main');
		},

		'should use moduleType if specified': function() {
			var dsc = npm.createDescriptor({
				moduleType: ['a', 'b']
			});

			assert.equals(dsc.moduleType, ['a', 'b']);
		},

		'should default moduleType to ["node"] if not specified': function() {
			var dsc = npm.createDescriptor({});

			assert.equals(dsc.moduleType, ['node']);
		},

		'should prefer using browser field as the main if available': function () {
			var dsc = npm.createDescriptor({
				main: 'main.js',
				browser: 'browser-main.js'
			});

			assert.equals(dsc.main, 'browser-main');
		}

	}

});
