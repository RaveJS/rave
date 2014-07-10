var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var findEs5ModuleTypes = require('../../../lib/find/es5ModuleTypes');
var fs = require('fs');
var path = require('path');

var sampleAmdFile = getFile('../../samples/classic.amd');
var sampleAmdWrappedCjsFile = getFile('../../samples/wrappedCjs.amd');
var sampleUmdFile = getFile('../../samples/full.umd');
var sampleCjsFile = getFile('../../samples/classic.cjs');
var sampleNodeFile = getFile('../../samples/node.cjs');
var sampleCujoFile = getFile('../../samples/cujo-style.umd');

buster.testCase('find/es5moduleTypes', {
	'should detect AMD': function () {
		var result;
		result = findEs5ModuleTypes(sampleAmdFile);
		assert(result.isAmd, 'detect AMD in classic AMD file');
		result = findEs5ModuleTypes(sampleAmdWrappedCjsFile);
		assert(result.isAmd, 'detect AMD in CommonJS-wrapped AMD file');
		result = findEs5ModuleTypes(sampleUmdFile);
		assert(result.isAmd, 'detect AMD inside UMD');
		result = findEs5ModuleTypes(sampleCujoFile);
		assert(result.isAmd, 'detect AMD inside cujojs UMD');
		result = findEs5ModuleTypes(sampleCjsFile);
		refute(result.isAmd, 'detect AMD inside CommonJS');
		result = findEs5ModuleTypes(sampleNodeFile);
		refute(result.isAmd, 'detect AMD inside node module');
	},

	'should detect CommonJS/node': function () {
		var result;
		result = findEs5ModuleTypes(sampleAmdFile);
		refute(result.isCjs, 'detect CommonJS in classic AMD file');
		result = findEs5ModuleTypes(sampleAmdWrappedCjsFile);
		refute(result.isCjs, 'detect AMD in CommonJS-wrapped AMD file');
		result = findEs5ModuleTypes(sampleUmdFile);
		assert(result.isCjs, 'detect CommonJS inside UMD');
		result = findEs5ModuleTypes(sampleCujoFile);
		assert(result.isAmd, 'detect CommonJS inside cujojs UMD');
		result = findEs5ModuleTypes(sampleCjsFile);
		assert(result.isCjs, 'detect CommonJS inside CommonJS');
		result = findEs5ModuleTypes(sampleNodeFile);
		assert(result.isCjs, 'detect CommonJS inside node module');
	},

	'should short-circuit search for CommonJS when AMD is preferred': function () {
		var result = findEs5ModuleTypes(sampleCujoFile, true);
		assert(result.isAmd, 'detect AMD inside cujojs UMD');
		refute(result.isCjs, 'detect CommonJS inside cujojs UMD');
	}

});


function getFile (name) {
	return fs.readFileSync(path.join(__dirname, name)).toString();
}
