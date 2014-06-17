var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

var uid = require('../../lib/uid');

// TODO: Make these tests better
buster.testCase('lib/uid', {

	create: {
		'when normalized is not provided': {
			'should create name@version from descriptor with name and version': function() {
				var u = uid.create({ name: 'a', version: '1' });
				assert.equals(u, 'a@1');
			},

			'should create name from descriptor with only name': function() {
				var u = uid.create({ name: 'a' });
				assert.equals(u, 'a');
			}
		},

		'when normalized is provided': {
			'should create name@version#normalized from descriptor with name and version': function() {
				var u = uid.create({ name: 'a', version: '1' }, 'b');
				assert.equals(u, 'a@1#b');

			},

			'should create name#normalized from descriptor with only name': function() {
				var u = uid.create({ name: 'a' }, 'b');
				assert.equals(u, 'a#b');
			}

		}

	},

	// TODO: More/better tests for parse
	parse: {
		'should have name, pkgName, modulePath, and pkgUid': function() {
			var parsed = uid.parse('a#b/c/d');
			assert.equals(parsed.name, 'b/c/d');
			assert.equals(parsed.pkgName, 'b');
			assert.equals(parsed.modulePath, 'c/d');
			assert.equals(parsed.pkgUid, 'a');
		}
	},

	getName: {
		'should handle module uids': function () {
			assert.equals(uid.getName('a#b/c/d'), 'b/c/d');
		},
		'should handle module names': function () {
			assert.equals(uid.getName('b/c/d'), 'b/c/d');
		}
	}

});
