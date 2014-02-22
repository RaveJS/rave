/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var path = require('../lib/path');

module.exports = locateNpm;

var joinPaths = path.joinPaths;
var ensureExt = path.ensureExt;

function locateNpm (load) {
	// TODO
	return ensureExt(joinPaths(this.baseUrl, load.name), '.js');
}
