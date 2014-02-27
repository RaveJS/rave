var Loader, Module;
(function (isNode, isBrowser) {
	var browserFetch, legacy;

	if (isBrowser) {

		// es6-module-loader's System does a bit more than we like, so we don't
		// use it instead we just use `new Loader({});`.  Unfortunately,
		// Loader.prototype.fetch throws, so we have to fix that:
		Loader.prototype.fetch = function (load) {
			if (!browserFetch) {
				browserFetch = this.get('rave/pipeline/fetchAsText').default;
			}
			return browserFetch(load);
		};

		Loader.prototype.instantiate = function (load) {
			// assume legacy script installed a global side-effect
			return {
				deps: [],
				execute: function () { return new Module({}); }
			};
		};

	}
	else if (isNode) {

		// es6-module-loader doesn't export to the current scope in node
		if (typeof Loader === 'undefined') {
			Loader = global.Loader = exports.Loader;
		}
		if (typeof Module === 'undefined') {
			Module = global.Module = exports.Module;
		}

		Loader.prototype.instantiate = function (load) {
			if (!legacy) {
				legacy = this.get('rave/lib/legacy');
			}
			// if we got here, assume the request is for a node built-in module
			return {
				deps: [],
				execute: function () {
					var exports = require(load.name);
					legacy.toLoader(exports);
				}
			};
		};

	}

}(typeof exports !== 'undefined', typeof document != 'undefined'));
