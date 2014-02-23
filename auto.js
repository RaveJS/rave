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
			metadata.crawl(context, urls[i]).then(void 0, logMissing)
		);
	}
	Promise.all(processors).then(done);

	function done (metadatas) {
		context = setRavePackages(context, metadatas);
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

function setRavePackages (context, metadatas) {
	var url;
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
		// TODO: remove this if we no longer have versioned and unversioned packages
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
	// friggin es6 loader doesn't run normalize on dynamic import!!!!
	var normalized = context.loader.normalize(raveExtension, '');
	return context.loader.import(normalized)
		.then(function (extension) {
			if (extension.pipeline) {
				extension.pipeline(context).applyTo(context.loader);
			}
		});
}

function initApplication (context, metadatas) {
	var i, meta, mainModule, atLeastOne = false;
	for (i = 0; i < metadatas.length; i++) {
		meta = metadatas[i];
		atLeastOne |= meta;
		if (meta && meta.main) {
			// TODO: implement main modules
			mainModule = path.joinPaths(meta.name, meta.main);
			return runMain(context, mainModule)
				.then(function () { return context; });
		}
	}
	// TODO: if no main modules found, look for one in a conventional place
	// TODO: warn if multiple main modules were found, but only the first was run
	if (!atLeastOne) logNoMetadata(context);
}

function logNoMetadata (context) {
	console.error('Did not find any metadata files', context.raveMeta);
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
