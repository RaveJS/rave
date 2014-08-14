/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

// TODO: don't load metadata for packages that have already been crawled

// main exports

exports.crawl = crawl;
exports.load = load;
exports.withState = withState;

// exports for testing

exports.childIterator = childIterator;
exports.createStorer = createStorer;
exports.collect = collect;
exports.extractValue = extractValue;

function crawl (context) {
	var storeMetadata = createStorer('metadata');
	var storeChildren = createStorer('children');

	return withState(context.load)([context, context.fileUrl])
		.then(storeMetadata)
		.then(withState(context.getChildrenNames))
		.then(withState(childIterator))
		.then(storeChildren)
		.then(withState(context.convert))
		// TODO: start collecting in the context, context.collect?
		.then(withState(collect))
		.then(extractValue);
}

function load (context, fileUrl) {
	return require.async(fileUrl);
}

function childIterator (context, names) {
	var childCrawlers = names.map(function (name) {
		return context.childCrawler(context, name);
	});
	return Promise.all(childCrawlers);
}

function createStorer (key) {
	return withState(function (context, value) {
		context[key] = value;
		return context;
	});
}

function collect (context, data) {
	context.all.push(data);
	return data;
}

function withState (func) {
	return function (stateAndValue) {
		var state = stateAndValue[0], value = stateAndValue[1];
		return Promise.resolve(func.call(this, state, value))
			.then(function (nextValue) {
				return [state, nextValue];
			});
	};
}

function extractValue (stateAndValue) {
	return stateAndValue[1];
}
