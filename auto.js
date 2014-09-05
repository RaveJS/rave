/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var metadata = require('./lib/metadata');
var fromMetadata = require('./lib/hooksFromMetadata');
var beget = require('./lib/beget');
var path = require('./lib/path');
var pkg = require('./lib/package');
var override = require('./load/override');
var crawl = require('./lib/crawl');

module.exports = {
	main: autoConfigure,
	applyLoaderHooks: applyLoaderHooks
};

var defaultMeta = 'bower.json,package.json';

function autoConfigure (context) {
	var urls, applyLoaderHooks;

	if (!context.raveMeta) context.raveMeta = defaultMeta;

//	urls = context.raveMeta.split(/\s*,\s*/);

	context.packages = {};

	applyLoaderHooks = this.applyLoaderHooks;

	return crawl(context.raveMeta)
		.then(failIfNone)
		.then(done)
		['catch'](failHard);

	function done (allMetadata) {

		context.packages = allMetadata.packages;
		context = gatherAppMetadata(context, allMetadata.roots);
		return configureLoader(context)
			.then(gatherExtensions)
			.then(function (extensions) {
				// TODO: remove || [] when Promise shim is fixed
				return applyLoaderHooks(context, extensions || []);
			})
			.then(function (extensions) {
				// TODO: remove || [] when Promise shim is fixed
				return applyFirstMain(context, extensions || []);
			})
			.then(function (alreadyRanMain) {
				return !alreadyRanMain && initApplication(context);
			});
	}
}

function failIfNone (allMetadata) {
	if (allMetadata.roots.length === 0) {
		throw new Error('No metadata files found.');
	}
	return allMetadata;
}

function gatherAppMetadata (context, metadatas) {
	// TODO: if no main modules found, look for one in a conventional place
	// TODO: warn if multiple main modules were found, but only the first was run
	var first;
	context.metadata = metadatas;
	first = context.metadata[0];
	if (first) {
		context.app = {
			name: first.name,
			main: path.joinPaths(first.name, first.main),
			metadata: first
		};
	}
	else {
		logNoMetadata(context);
	}
	return context;
}

function configureLoader (context) {
	var overrides = fromMetadata(context);
	context.load.overrides = overrides;
	var hooks = override.hooks(context.load.nativeHooks, overrides);
	for (var name in hooks) {
		context.loader[name] = hooks[name];
	}
	return Promise.resolve(context);
}

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

function applyLoaderHooks (context, extensions) {
	return Promise.all(extensions).then(function (extensions) {
		return extensions.map(function (extension) {
			var api = extension.api;
			if (!api) return;
			if (api.load) {
				context.load.overrides = context.load.overrides.concat(api.load);
			}
		});
	}).then(function () {
		var hooks = override.hooks(context.load.nativeHooks, context.load.overrides);
		for (var name in hooks) {
			context.loader[name] = hooks[name];
		}
	}).then(function () {
		return extensions;
	});
}

function applyFirstMain (context, extensions) {
	var appliedMain;
	extensions.map(function (extension) {
		var api = extension.api;
		if (api && api.main) {
			if (appliedMain) {
				throw new Error('Found multiple extensions with main().');
			}
			appliedMain = Promise.resolve(api.main(beget(context))).then(function () {
				return true;
			});
		}
	});
	return Promise.resolve(appliedMain);
}

function initApplication (context) {
	var mainModule;
	mainModule = context.app && context.app.main;
	if (mainModule) {
		return runMain(context, mainModule)
			.then(function () { return context; });
	}
	else {
		return context;
	}
}

function runMain (context, mainModule) {
	return require.async(mainModule)
		.then(function (main) {
			if (typeof main === 'function') {
				main(beget(context));
			}
			else if (typeof main.main === 'function') {
				main.main(beget(context));
			}
		});
}

function logNoMetadata (context) {
	console.error('Did not find any metadata files', context.raveMeta);
}

function failHard (ex) {
	setTimeout(function () { throw ex; }, 0);
}
