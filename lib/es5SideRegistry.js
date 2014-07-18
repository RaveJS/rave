/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

exports.set = add;
exports.get = get;
exports.has = has;
exports.remove = remove;

// shared registry
var registry = {};

function add (id, execute) {
	return registry[id] = executeOnce(id, execute);
}

function get (id) {
	return registry[id]();
}

function has (id) {
	return id in registry;
}

function remove (id) {
	var execute = registry[id];
	delete registry[id];
	return execute;
}

function executeOnce (id, execute) {
	return function () {
		var value = execute.apply(this, arguments);
		// replace registry entry with a simple execute function
		add(id, simpleExecute(value));
		return value;
	};
}

function simpleExecute (value) {
	return function () { return value; };
}
