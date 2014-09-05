/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

// TODO: don't load metadata for packages that have already been crawled

// main exports

exports.crawl = crawl;
exports.load = typeof require.async !== 'undefined'
	? load
	: nativeLoad;

// exports for testing

exports.childIterator = childIterator;
exports.store = store;
exports.collectMetadata = collectMetadata;
exports.collectOverrides = collectOverrides;
exports.applyOverrides = applyOverrides;
exports.start = start;
exports.proceed = proceed;
exports.end = end;

function crawl (context) {
	var load = start(context.load);
	return load(context, context.fileUrl)
		.then(proceed(applyOverrides))
		.then(proceed(collectOverrides))
		.then(proceed(store('metadata')))
		.then(proceed(context.getChildrenNames))
		.then(proceed(childIterator))
		.then(proceed(store('children')))
		.then(proceed(context.convert))
		// TODO: start collecting in the context, context.collect?
		.then(proceed(collectMetadata))
		.then(end);
}

function load (context, fileUrl) {
	return require.async(fileUrl);
}

function nativeLoad (context, fileUrl) {
	return Promise.resolve(require(fileUrl));
}

function childIterator (context, names) {
	var childCrawlers = names.map(function (name) {
		return context.childCrawler(context, name);
	});
	return Promise.all(childCrawlers);
}

function store (key) {
	return function (context, value) {
		context[key] = value;
		return context;
	};
}

function collectMetadata (context, data) {
	context.all.push(data);
	return data;
}

function collectOverrides (context, data) {
	var key, overrides, missing;
	if (data && data.rave) {
		overrides = data.rave.overrides;
		for (key in overrides) {
			context.overrides[key] = overrides[key];
		}
		missing = data.rave.missing;
		for (key in missing) {
			context.missing[key] = missing[key];
		}
	}
	return data;
}

function applyOverrides (context, data) {
	if (data) {
		_applyOverrides(false, context.overrides, data);
		_applyOverrides(true, context.missing, data);
	}
	return data;
}

function _applyOverrides (ifMissing, source, data) {
	var overrides, key;
	if (data.name in source) {
		overrides = source[data.name];
		for (key in overrides) {
			if (!ifMissing || !(key in data)) {
				data[key] = overrides[key];
			}
		}
	}
}

function start (func) {
	return function (state, value) {
		return resolveStateAndValue(func, state, value);
	}
}

function proceed (func) {
	return function (stateAndValue) {
		var state = stateAndValue[0], value = stateAndValue[1];
		return resolveStateAndValue(func, state, value);
	};
}

function end (stateAndValue) {
	return stateAndValue[1];
}

function resolveStateAndValue (func, state, value) {
	return Promise.resolve(func.call(this, state, value))
		.then(function (nextValue) {
			return [state, nextValue];
		});
}
