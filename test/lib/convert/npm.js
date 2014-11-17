var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

require('when/es6-shim/Promise');
var npm = require('../../../lib/convert/npm');

buster.testCase('lib/convert/npm', {

	npmFixups: {
		'should use browser property, main property, or "index" as main': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			delete data.main;
			data = npmFixups(data);
			assert.same(data.main, 'index', 'test1');
			data.main = "main";
			data = npmFixups(data);
			assert.same(data.main, 'main', 'test2');
			data.metadata.browser = "browser";
			data = npmFixups(data);
			assert.same(data.main, 'browser', 'test3');
			data.metadata.browser = {}; // only if browser is a string
			data.main = "main";
			data = npmFixups(data);
			assert.same(data.main, 'main', 'test4');
		},
		'should remove extension from main property': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data.main = "main.js";
			data = npmFixups(data);
			assert.equals(data.main, "main");
		},
		'create a mapFunc if browser is an object': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data.metadata.browser = {};
			data = npmFixups(data);
			assert.isFunction(data.mapFunc);
		},
		'should adopt directories.lib of metadata as location': function () {
			var npmFixups = npm.npmFixups;
			var data = createData();
			data.metadata.directories = { lib: "root" };
			data = npmFixups(data);
			assert.equals(data.location, "location/root");
		}
	}

});

function createData () {
	return {
		metadata: {},
		location: "location",
		name: "name"
	};
}
