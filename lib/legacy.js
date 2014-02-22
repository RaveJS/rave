/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
module.exports = legacyAccessors;

function legacyAccessors (loader) {
	var get = loader.get;
	var set = loader.set;
	return {
		get: function (id) {
			var value = get.call(loader, id);
			return value && value.__es5Module ? value.__es5Module : value;
		},

		set: function (id, module) {
			var value = Object(module) === module ? module : {
				// for real ES6 modules to consume this module
				'default': module,
				// for modules transpiled from ES6
				__es5Module: module
			};
			// TODO: spec is ambiguous whether Module is a constructor or factory
			set.call(loader, id, new Module(value));
		}
	};

}
