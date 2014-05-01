/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var auto = require('./auto');

module.exports = {
	main: startDebug
};

var debuggingMessage = "\
┏( ＾◡＾)┛ ┗(＾◡＾ )┓ Welcome to the RaveJS debug party! ┏( ＾◡＾)┛ ┗(＾◡＾ )┓\n\
\n\
If you see some 404s for JSON files, that's ok! \
They'll go away when you build your app.\n\
If the 404s are spoiling your debug party, the README.md shows how to evict them.\n\n\
-> Type rave() to turn on REPL commands. (experimental)";

var replCommands = "Available commands:\n\
-> rave.dump() - dumps rave's context to the console.\n\
-> rave.version - shows rave's version.\n\
-> rave.help() - shows these commands.\n\
-> what else should we provide????";

var replEnabledMessage = "Rave {raveVersion} REPL enabled! \n"
	+ replCommands;

function startDebug (context) {
	var rave, replEnabled;

	console.log(debuggingMessage);

	rave = global.rave = function (quiet) {
		var message, version;

		version = findVersion(context);
		message = renderMessage({ raveVersion: version }, replEnabledMessage);

		if (replEnabled) {
			console.log(message);
			return;
		}

		replEnabled = true;

		// TODO: load a debug REPL module?
		rave.dump = function () {
			console.log(context);
		};
		rave.version = version;
		rave.help = function () {
			console.log(replCommands);
		};

		if (!quiet) {
			console.log(message);
		}
	};

	auto.main(context);
}

function findVersion (context) {
	return context.packages.rave.metadata.version;
}

function renderMessage (values, template) {
	return template.replace(/\{([^\}]+)\}/g, function (m, key) {
		return values[key];
	});
}
