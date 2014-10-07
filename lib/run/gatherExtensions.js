/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var path = require('../path');

module.exports = gatherExtensions;

function gatherExtensions (context) {
	var seen, name, pkg, promises, extensionMeta;
	seen = {};
	promises = [];
	for (name in context.packages) {
		pkg = context.packages[name];
		// packages are keyed by versioned and unversioned names
		if (!(pkg.name in seen)) {
			seen[pkg.name] = true;
			if (pkg.rave) {
				extensionMeta = pkg.rave;
				if (typeof extensionMeta === 'string') {
					extensionMeta = { extension: extensionMeta };
				}
				if (extensionMeta.extension) {
					promises.push(initExtension(context, pkg.name, extensionMeta.extension));
				}

			}
		}
	}
	return Promise.all(promises);
}

function initExtension (context, packageName, moduleName) {
	return fetchExtension(path.joinPaths(packageName, moduleName))
		.then(extractExtensionCtor)
		.then(function (api) {
			return createExtensionApi(context, api);
		})
		['catch'](function (ex) {
			ex.message = 'Failed to initialize rave extension, "'
				+ packageName + '": ' + ex.message;
			throw ex;
		})
		.then(function (api) {
			return { name: packageName, api: api };
		});
}

function fetchExtension (extModuleName) {
	return require.async(extModuleName);
}

function extractExtensionCtor (extModule) {
	var create;
	if (extModule) {
		create = typeof extModule === 'function'
			? extModule
			: extModule.create;
	}
	if (!create) {
		throw new Error('API not found.');
	}
	return create;
}

function createExtensionApi (context, extension) {
	return extension(context);
}
