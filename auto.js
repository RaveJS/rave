/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var metadata = require('./lib/metadata');
var fromMetadata = require('./lib/pipeline');
var beget = require('./lib/beget');
var path = require('./lib/path');
var pkg = require('./lib/package');

module.exports = {
	main: autoConfigure
};

var defaultMeta = 'bower.json,package.json';

function autoConfigure (context) {
	var urls, processors, howMany, i;

	if (!context.raveMeta) context.raveMeta = defaultMeta;

	urls = context.raveMeta.split(/\s*,\s*/);
	howMany = urls.length;
	processors = [];

	for (i = 0; i < howMany; i++) {
		processors.push(
			metadata.crawl(context, urls[i])['catch'](logMissing)
		);
	}
	// TODO: consider returning this promise to rave.js to handle rejections
	Promise.all(processors).then(done)['catch'](failHard);

	function done (metadatas) {
		context = gatherAppMetadata(context, metadatas);
		context = normalizeRavePackage(context);
		return configureLoader(context)
			.then(initRaveExtensions)
			.then(function () {
				return initApplication(context, metadatas);
			});
	}

	function logMissing (ex) {
		console.error('Did not find metadata file', ex);
		console.error(ex.stack);
	}
}

function gatherAppMetadata (context, metadatas) {
	// TODO: if no main modules found, look for one in a conventional place
	// TODO: warn if multiple main modules were found, but only the first was run
	var i, meta, first;
	context.metadata = [];
	for (i = 0; i < metadatas.length; i++) {
		meta = metadatas[i];
		// skip missing metadata files
		if (meta) {
			// save metadata
			context.metadata.push(meta);
			if (!first) first = meta;
		}
	}
	if (first) {
		context.app = {
			name: first.name,
			main: first.main,
			metadata: first
		};
	}
	else {
		logNoMetadata(context);
	}
	return context;
}

function normalizeRavePackage (context) {
	context.packages.rave = pkg.normalizeDescriptor(context.packages.rave);
	context.packages.rave.uid = context.packages.rave.name = 'rave';
	return context;
}

function configureLoader (context) {
	var pipeline = fromMetadata(context);
	pipeline.applyTo(context.loader);
	return Promise.resolve(context);
}

function initRaveExtensions (context) {
	var seen, name, pkg, promises;
	seen = {};
	promises = [];
	for (name in context.packages) {
		pkg = context.packages[name];
		// packages are keyed by versioned and unversioned names
		if (!(pkg.name in seen)) {
			seen[pkg.name] = true;
			if (pkg.metadata && pkg.metadata.rave) {
				promises.push(
					runRaveExtension(context, path.joinPaths(pkg.name, pkg.metadata.rave))
				);
			}
		}
	}
	return Promise.all(promises).then(function () { return context; });
}

function runRaveExtension (context, raveExtension) {
	return require.async(raveExtension)
		.then(function (extension) {
			if (extension.pipeline) {
				extension.pipeline(context).applyTo(context.loader);
			}
		});
}

function initApplication (context, metadatas) {
	var mainModule;
	mainModule = context.app.main;
	if (mainModule) {
		mainModule = path.joinPaths(context.app.name, mainModule);
		return runMain(context, mainModule)
			.then(function () { return context; });
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
