/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

module.exports = applyFirstMain;

function applyFirstMain (context, extensions) {
	var appliedMain;
	extensions.map(function (extension) {
		var api = extension.api;
		if (api && api.main) {
			if (appliedMain) {
				throw new Error('Found multiple extensions with main().');
			}
			appliedMain = Promise.resolve(api.main(Object.create(context))).then(function () {
				return true;
			});
		}
	});
	return Promise.resolve(appliedMain);
}
