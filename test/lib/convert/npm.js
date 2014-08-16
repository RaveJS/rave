var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

require('when/es6-shim/Promise');
var npm = require('../../../lib/convert/npm');

buster.testCase('lib/convert/npm', {

	convert: {
		'//should be tested': function () {
			assert(false);
		}
	},

	npmFixups: {
		'should use browser property, main property, or "index" as main': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			delete data.main;
			data = npmFixups(data);
			assert.same(data.main, 'index');
			data.main = "main";
			data = npmFixups(data);
			assert.same(data.main, 'main');
			data.browser = "browser";
			data = npmFixups(data);
			assert.same(data.main, 'browser');
			data.browser = {}; // only if browser is a string
			data.main = "main";
			data = npmFixups(data);
			assert.same(data.main, 'main');
		},
		'should remove extension from main property': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data.main = "main.js";
			data = npmFixups(data);
			assert.equals(data.main, "main");
		},
		'create a map if browser is an object': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data.browser = {};
			data = npmFixups(data);
			assert.isObject(data.map);
			assert.isFunction(data.mapFunc);
		},
		'should provide moduleType if missing': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data = npmFixups(data);
			assert.isArray(data.moduleType);
		},
		'should adopt directories.lib of metadata as location': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data.directories = { lib: "root" };
			data = npmFixups(data);
			assert.equals(data.location, "root");
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
