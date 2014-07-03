var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

var bower = require('../../../lib/metadata/bower');

buster.testCase('lib/metadata/bower', {

	createDescriptor: {
		'should append main dirname to location': function() {
			var bowerTest = Object.create(bower, {
				pkgRoot: { value: 'existing/part' }
			});

			var dsc = bowerTest.createDescriptor({
				main: 'deep/path/to/main.js'
			});

			assert.equals(dsc.location, 'existing/part/deep/path/to');
		},

		'should set main to main basename': function() {
			var dsc = bower.createDescriptor({
				main: 'deep/path/to/main'
			});

			assert.equals(dsc.main, 'main');
		},

		'should remove main\'s extension': function() {
			var dsc = bower.createDescriptor({
				main: 'deep/path/to/main.js'
			});

			assert.equals(dsc.main, 'main');
		},

		'should use moduleType if specified': function() {
			var dsc = bower.createDescriptor({
				moduleType: ['a', 'b']
			});

			assert.equals(dsc.moduleType, ['a', 'b']);
		}
	}

});
