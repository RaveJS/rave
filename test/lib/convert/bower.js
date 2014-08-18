var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

require('when/es6-shim/Promise');
var bower = require('../../../lib/convert/bower');

buster.testCase('lib/convert/bower', {

	convert: {
		'//should be tested': function () {
			assert(false);
		}
	},

	bowerFixups: {
		'should provide a main property if missing': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			delete data.main;
			data = bowerFixups(data);
			assert(data.main);
		},
		'should preserve existing main property': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			data.main = "main";
			data = bowerFixups(data);
			assert.equals(data.main, "main");
		},
		'should remove extension from main property': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			data.main = "main.js";
			data = bowerFixups(data);
			assert.equals(data.main, "main");
		},
		'should return a javascript file from mains array': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			data.main = [ "theme.css", "index.js" ];
			data = bowerFixups(data);
			assert.equals(data.main, "index");
		},
		'should return name if all other attempt to find main fail': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			data.main = null;
			data = bowerFixups(data);
			assert.equals(data.main, "name");
		},
		'should adopt directories.lib of metadata as location': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			data.metadata.directories = { lib: "location" };
			data = bowerFixups(data);
			assert.equals(data.location, "location");
		},
		'should append main\'s directory to location': function () {
			var bowerFixups = bower.bowerFixups;
			var data = createData();
			data.location = "root";
			data.main = "folder/file";
			data = bowerFixups(data);
			assert.equals(data.location, "root/folder");
			assert.equals(data.main, "file");
		}
	}

});

function createData () {
	return {
		getMetadata: getMetadata,
		metadata: {},
		location: "location",
		name: "name"
	};
}

function getMetadata () {
	return this.metadata;
}
