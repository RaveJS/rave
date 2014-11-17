/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var global, doc, location,
	raveMain, hooksName, amdBundleModuleName;

global = typeof self !== 'undefined' && self
	|| typeof global !== 'undefined' && global;

doc = global.document;
location = window.location;

raveMain = '/*===raveMain===*/';
hooksName = '/*===raveHooks===*/';
amdBundleModuleName = '/*===raveAmdBundle===*/';

// export public functions
exports.init = init;
exports.boot = boot;
exports.simpleDefine = simpleDefine;
exports.contextDefine = contextDefine;
exports.evalPredefines = evalPredefines;

// export testable functions
exports.getCurrentScript = getCurrentScript;
exports.getPathFromUrl = getPathFromUrl;
exports.mergeGlobalOptions = mergeGlobalOptions;
exports.fromLoader = fromLoader;
exports.toLoader = toLoader;
exports.autoModules = autoModules;
exports.ensureFactory = ensureFactory;

// initialize
function init (context) {
	var scriptUrl = getCurrentScript();
	var baseUrl = doc
		? getPathFromUrl(
			// Opera has no location.origin, so we have to build it
			location.protocol + '//' + location.host + location.pathname
		)
		: __dirname;

	context.raveScript = scriptUrl;
	context.baseUrl = baseUrl;
	context.loader = new Loader({});

	return mergeGlobalOptions(context);
}

function boot (context) {
	var loader = context.loader;
	try {
		var hooks = fromLoader(loader.get(hooksName));
		// extend loader enough to load rave
		hooks(context);
		// launch rave
		loader.import(raveMain).then(go, failLoudly);
	}
	catch (ex) {
		failLoudly(ex);
	}
	function go (main) {
		main = fromLoader(main);
		if (!main) failLoudly(new Error('No main module.'));
		else if (typeof main.main === 'function') main.main(context);
		else if (typeof main === 'function') main(context);
	}
	function failLoudly (ex) {
		console.error(ex);
		throw ex;
	}
}

function getCurrentScript () {
	var stack, matches;

	// HTML5 way
	if (doc && doc.currentScript) return doc.currentScript.src;

	// From https://gist.github.com/cphoover/6228063
	// (Note: Ben Alman's shortcut doesn't work everywhere.)
	// TODO: see if stack trace trick works in IE8+.
	// Otherwise, loop to find script.readyState == 'interactive' in IE.
	stack = '';
	try { throw new Error(); } catch (ex) { stack = ex.stack; }
	matches = stack.match(/(?:http:|https:|file:|\/).*?\.js/);

	return matches && matches[0];
}

function getPathFromUrl (url) {
	var last = url.lastIndexOf('/');
	return url.slice(0, last) + '/';
}

function mergeGlobalOptions (context) {
	if (!doc) return context;
	var el = doc.documentElement;
	var meta = el.getAttribute('data-rave-meta');
	if (meta) {
		context.raveMeta = meta;
	}
	return context;
}

function simpleDefine (context) {
	var loader, _global;
	loader = context.loader;
	// temporary work-around for es6-module-loader which throws when
	// accessing loader.global
	try { _global = loader.global } catch (ex) { _global = global; }
	global.global = global; // TODO: remove this when we are able to supply a 'global' to crammed node modules
	return function (id, deps, factory) {
		var scoped, modules, i, len, isCjs = false, value;
		scoped = {
			require: function (id) { return fromLoader(loader.get(id)); },
			exports: {},
			global: _global
		};
		scoped.module = { exports: scoped.exports };
		scoped.require.async = function (id) {
			// hack: code needs a refid even though we're using abs ids already
			var abs = loader.normalize(id, 'rave');
			return loader.import(abs).then(fromLoader);
		};
		modules = [];
		// if deps has been omitted
		if (arguments.length === 2) {
			factory = deps;
			deps = autoModules(factory);
		}
		for (i = 0, len = deps.length; i < len; i++) {
			modules[i] = deps[i] in scoped
				? scoped[deps[i]]
				: scoped.require(deps[i]);
			isCjs |= deps[i] === 'exports' || deps[i] === 'module';
		}
		// eager instantiation.
		value = factory.apply(null, modules);
		// find result, preferring a returned value
		if (typeof value !== 'undefined') {
			value = toLoader(value);
		}
		else if (isCjs) {
			value = scoped.exports;
			if (scoped.module.exports !== value) {
				value = toLoader(scoped.module.exports);
			}
		}
		else {
			value = {}; // es6 needs an object
		}
		loader.set(id, new Module(value));
	};
}

function contextDefine (context) {
	return function () {
		var bctx;
		bctx = arguments[arguments.length - 1];
		if (typeof bctx === 'function') bctx = bctx();
		context.app = bctx.app;
		context.env = bctx.env;
		context.metadata = bctx.metadata;
		context.packages = bctx.packages;
	};
}

function evalPredefines (bundle) {
	var defines = [];
	return function (context) {
		var loader, process, load;

		define.amd = { jQuery: true };
		bundle(define);
		if (!defines.length) return context;

		loader = context.loader;
		process = loader.get(amdBundleModuleName).process;
		load = {
			address: context.raveScript,
			metadata: { rave: context }
		};

		process(load, defines);

		return context;
	};
	function define (id, deps, factory) {
		if (arguments.length === 2) {
			factory = deps;
			deps = autoModules(factory);
		}
		defines.push({
			name: id,
			depsList: deps,
			factory: ensureFactory(factory)
		});
	}
}

function autoModules (factory) {
	return ['require', 'exports', 'module'].slice(0, factory.length);
}

function ensureFactory (factory) {
	return typeof factory === 'function'
		? factory
		: function () { return factory; }
}

function fromLoader (value) {
	return value && value.__es5Module ? value.__es5Module : value;
}

function toLoader (value) {
	return {
		// for real ES6 modules to consume this module
		'default': value,
		// for modules transpiled from ES6
		__es5Module: value
	};
}
