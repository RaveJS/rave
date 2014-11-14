var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

require('when/es6-shim/Promise');
var common = require('../../../lib/convert/common');

buster.testCase('lib/convert/common', {

	transform: {
		'should add version property if missing': function () {
			var transform = common.transform;
			var data = transform(createData());
			assert(data.version);
		},
		'should copy name property from original if missing': function () {
			var transform = common.transform;
			var orig = createData();
			orig.name = 'foo';
			var data = transform(orig);
			assert(data.name);
		}
	}

});

function createData () {
	return {
		getMetadata: getMetadata,
		metadata: {},
		location: "location",
		name: "name",
		children: []
	};
}

function getMetadata () {
	return this.metadata;
}
