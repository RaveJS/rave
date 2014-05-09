/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var rave, document, defaultMain, debugMain, hooksName,
	context, loader, define;

rave = exports || {};

document = global.document;

defaultMain = 'rave/auto';
debugMain = 'rave/debug';
hooksName = 'rave/src/hooks';

// export testable functions
rave.boot = boot;
rave.getCurrentScript = getCurrentScript;
rave.mergeBrowserOptions = mergeBrowserOptions;
rave.mergeNodeOptions = mergeNodeOptions;
rave.simpleDefine = simpleDefine;

// initialize
rave.scriptUrl = getCurrentScript();
rave.scriptPath = getPathFromUrl(rave.scriptUrl);
rave.baseUrl = document
	? getPathFromUrl(document.location.origin + document.location.pathname)
	: __dirname;

context = (document ? mergeBrowserOptions : mergeNodeOptions)({
	raveMain: defaultMain,
	raveScript: rave.scriptUrl,
	baseUrl: rave.baseUrl,
	loader: new Loader({})
});

loader = context.loader;
define = simpleDefine(loader);
define.amd = {};

function boot (context) {
	var main = context.raveMain;
	try {
		// check if we should load debugMain instead
		if (context.debug || context.raveDebug) {
			// don't override main if user changed it with <html> attr
			if (context.raveMain === defaultMain) context.raveMain = debugMain;
		}
		// apply hooks overrides to loader
		var hooks = fromLoader(loader.get(hooksName));
		// extend loader
		hooks(context);
		loader.import(context.raveMain).then(go, failLoudly);
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
	if (document && document.currentScript) return document.currentScript.src;

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

function mergeBrowserOptions (context) {
	var el = document.documentElement, i, attr, prop;
	for (i = 0; i < el.attributes.length; i++) {
		attr = el.attributes[i];
		prop = attr.name.slice(5).replace(/(?:data)?-(.)/g, camelize);
		if (prop) context[prop] = attr.value || true;
	}
	return context;
	function camelize (m, l) { return l.toUpperCase();}
}

function mergeNodeOptions (context) {
	// TODO
	return context;
}

function simpleDefine (loader) {
	var _global;
	// temporary work-around for es6-module-loader which throws when
	// accessing loader.global
	try { _global = loader.global } catch (ex) { _global = global; }
	return function (id, deps, factory) {
		var scoped, modules, i, len, isCjs = false, value;
		scoped = {
			require: function (id) { return fromLoader(loader.get(id)); },
			exports: {},
			global: _global
		};
		scoped.module = { exports: scoped.exports };
		modules = [];
		// if deps has been omitted
		if (arguments.length === 2) {
			factory = deps;
			deps = ['require', 'exports', 'module'].slice(factory.length);
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
