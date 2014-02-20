var rave, amdEval, document, defaultMain,
	context, loader, legacy, define;

rave = exports;

amdEval = Function('define', 'return eval(arguments[1])');

document = global.document;

defaultMain = 'rave/auto';

// export testable functions
rave.boot = boot;
rave.getCurrentScript = getCurrentScript;
rave.mergeBrowserOptions = mergeBrowserOptions;
rave.simpleDefine = simpleDefine;
rave.legacyAccessors = legacyAccessors;

// initialize
rave.scriptUrl = getCurrentScript();
rave.scriptPath = getPathFromUrl(rave.scriptUrl);
rave.baseUrl = document
	? getPathFromUrl(document.location.href)
	: __dirname;

context = {
	lodeMain: defaultMain,
	baseUrl: rave.baseUrl,
	loader: loader,
	packages: { rave: rave.scriptUrl }
};

loader = new Loader({});
legacy = legacyAccessors(loader);
define = simpleDefine(legacy);
define.amd = {};

function boot (context) {
	try {
		// apply pipeline to loader
		var pipeline = legacy.get('rave/pipeline');
		// extend loader
		pipeline(context).applyTo(loader);
		loader.import(context.lodeMain).then(go, failLoudly);
	}
	catch (ex) {
		failLoudly(ex);
	}
	function go (main) {
		var childContext = beget(context);
		if (!main) failLoudly(new Error('No main module.'));
		else if (typeof main.main === 'function') main(childContext);
		else if (typeof main === 'function') main(childContext);
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

function simpleDefine (loader) {
	// TODO: have this return {id, deps, factory} instead of eagerly instantiating
	var _global;
	// temporary work-around for es6-module-loader which throws when
	// accessing loader.global
	try { _global = loader.global } catch (ex) { _global = global; }
	return function (id, deps, factory) {
		var scoped, modules, i, len, isCjs, result;
		scoped = {
			require: loader.get,
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
		result = factory.apply(null, modules);
		loader.set(id, isCjs ? scoped.module.exports : result);
	};
}

function legacyAccessors (loader) {
	// TODO: remove this when we add __es5Module to pipelines?
	var get = loader.get;
	var set = loader.set;
	var legacy = beget(loader);

	legacy.get = function (id) {
		var value = get.call(loader, id);
		return value && value.__es5Module ? value.__es5Module : value;
	};
	legacy.set = function (id, module) {
		var value = typeof module === 'object' ? module : {
			// for real ES6 modules to consume this module
			'default': module,
			// for modules transpiled from ES6
			__es5Module: module
		};
		// TODO: spec is ambiguous whether Module is a constructor or factory
		set.call(loader, id, new Module(value));
	};

	return legacy;
}

// TODO: we could probably use lode/lib/beget instead of this
function Begetter () {}
function beget (base) {
	var obj;
	Begetter.prototype = base;
	obj = new Begetter();
	Begetter.prototype = null;
	return obj;
}
