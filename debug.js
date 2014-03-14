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
-> rave.help() - shows these commands.\n\
-> what else should we provide????";

var replEnabledMessage = "RaveJS REPL enabled! "
	+ replCommands;

function startDebug (context) {
	var replEnabled;

	console.log(debuggingMessage);

	global.rave = function (quiet) {
		if (replEnabled) {
			console.log('RaveJS REPL enabled!');
			return;
		}
		replEnabled = true;
		// TODO: load a debug REPL module?
		global.rave.dump = function () {
			console.log(context);
		};
		global.rave.help = function () {
			console.log(replCommands);
		};
		if (!quiet) console.log(replEnabledMessage);
	};

	auto.main(context);
}
