/** @license MIT License (c) copyright 2014 original authors */
/** @author Karolis Narkevicius */
var createMapper = require('./createMapper');
var getModuleName = require('./uid').getModuleName;

module.exports = createPackageMapper;

function createPackageMapper (context) {
	var mapper = createMapper(context);
	return function (uid, refUid, refUrl) {
		var moduleName = uid.indexOf("#") > -1 ? getModuleName(uid) : uid;
		return mapper(moduleName, refUid, refUrl);
	};
}
