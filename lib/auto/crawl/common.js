/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

// TODO: don't load metadata for packages that have already been crawled

// main exports

exports.crawl = crawl;
exports.load = load;

// exports for testing

exports.createChildIterator = createChildIterator;
exports.createStorer = createStorer;
exports.createCollector = createCollector;

function crawl (crawler, data) {
	var storeMetadata = createStorer(data, 'metadata');
	var storeChildren = createStorer(data, 'children');
	var iterate = createChildIterator(crawler);
	var collect = createCollector(crawler);

	return crawler.load(data)
		.then(storeMetadata)
		.then(crawler.getChildrenNames)
		.then(iterate)
		.then(storeChildren)
		.then(crawler.convert)
		// TODO: start collecting in the crawler, crawler.collect?
		.then(collect);
}

function load (data) {
	return require.async(data.fileUrl);
}

function createChildIterator (crawler) {
	return function (names) {
		var childCrawlers = names.map(crawler.childCrawler);
		return Promise.all(childCrawlers);
	}
}

function createStorer (context, key) {
	return function (value) {
		context[key] = value;
		return context;
	};
}

function createCollector (crawler) {
	return function (data) {
		crawler.all.push(data);
		return data;
	};
}
