/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var auto = require('./auto');
var uid = require('./lib/uid');

module.exports = {
	main: startDebug
};

var debugging = "\
┏( ＾◡＾)┛ ┗(＾◡＾ )┓ Welcome to the RaveJS debug party! ┏( ＾◡＾)┛ ┗(＾◡＾ )┓\n\
\n\
If you see some 404s for JSON files, that's ok! \
They'll go away when you build your app.\n\
If the 404s are spoiling your debug party, the README.md shows how to evict them.\n\n\
-> Type rave() to turn on REPL commands. (experimental)";

var replCommands = "Available commands:\n\
-> rave.dump() - returns rave's context to be viewed or manipulated.\n\
-> rave.version - shows rave's version.\n\
-> rave.checkVersions() - checks if extensions are compatible.\n\
-> rave.help() - shows these commands.\n\
-> what else should we provide????";

var replEnabled = "Rave {raveVersion} REPL enabled! \n"
	+ replCommands;

var multipleRaves = "Warning: multiple versions of rave are installed. \
Update the app's dependencies or try the rave.checkVersions() REPL function.";

var raveResolution = "Warning: rave conflict indicated in bower.json. \
Update the app's dependencies or try the rave.checkVersions() REPL function.";

var semverNotInstalled = "Note: rave.checkVersions() requires the npm semver \
package to verify rave extension semver conflicts. However, the semver \n\
package isn't needed if you understand semver.\nTry updating your npm or \
bower dependencies.  If updating doesn't resolve the problem, reload \
and try rave.checkVersions() again after installing the npm semver package:\n\
$ npm install --save semver\n";

var updateDepsInstructions = "To update npm dependencies:\n\
$ npm cache clean && npm update && npm dedupe\n\
To update bower dependencies:\n\
$ bower cache clean && bower update";

var semverMissing = "  ?  {extName} does not specify a rave version. \
Please ask the author to add rave to peerDependencies (npm) or \
dependencies (bower). {bugsLink}";

var semverValid = "  ✓  {extName} depends on rave {raveSemver}.";

var semverInfo = "  -  {extName} depends on rave {raveSemver}.";

var semverInvalid = " !!! {extName} depends on rave {raveSemver}. \
If this extension is old, please ask the author to update it. {bugsLink}";

var currRaveVersion = "Rave version is {raveVersion}.";

function startDebug (context) {
	var rave, enabled;

	console.log(debugging);

	rave = global.rave = function () {
		var message, version;

		version = findVersion(context);
		message = render({ raveVersion: version }, replEnabled);

		if (enabled) {
			console.log(message);
			return;
		}

		enabled = true;

		// TODO: load a debug REPL module?
		rave.dump = function () {
			return context;
		};
		rave.version = version;
		rave.checkVersions = function () {
			runSemverOnExtensions(context);
		};
		rave.help = function () {
			console.log(replCommands);
		};

		console.log(message);
	};

	auto.main(context).then(
		detectExtensionConflict,
		function (ex) {
			detectExtensionConflict(context);
			throw ex;
		}
	);
}

function findVersion (context) {
	return context.packages.rave.metadata.version;
}

function render (values, template) {
	return template.replace(/\{([^\}]+)\}/g, function (m, key) {
		return values[key];
	});
}

function detectExtensionConflict (context) {
	// 1. check for more than one rave package. this indicates an npm conflict
	// caused by using "dependencies" instead of "peerDependencies" and
	// "devDependencies". it could also indicate that the user has installed
	// rave via one package manager and extensions via the other.
	if (hasMultipleRaves(context)) {
		console.warn(multipleRaves);
		console.log(updateDepsInstructions);
	}
	// 2. check for resolutions.rave in bower.json which indicates a bower conflict.
	// TODO: how do we detect this if the user hasn't chosen to save the resolution?
	if (hasRaveResolution(context)) {
		console.warn(raveResolution);
		console.log(updateDepsInstructions);
	}
}

function hasMultipleRaves (context) {
	var packages, version;
	packages = context.packages;
	for (var name in packages) {
		if (packages[name].name === 'rave') {
			if (typeof version === 'undefined') {
				version = packages[name].version;
			}
			else if (version !== packages[name].version) {
				return true;
			}
		}
	}
	return false;
}

function hasRaveResolution (context) {
	var metadata = context.metadata;
	for (var i = 0; i < metadata.length; i++) {
		if (metadata.resolutions && metadata.resolutions.rave) {
			return true;
		}
	}
	return false;
}

function runSemverOnExtensions (context) {
	return require.async('semver').then(runSemver, noSemver);
	function runSemver (semver) {
		var packages = context.packages;
		var seen = {};
		var name, pkg, raveSemver, currVer, meta, extName, satisfies, info;
		currVer = findVersion(context);
		console.log(render({ raveVersion: currVer }, currRaveVersion));
		for (name in packages) {
			pkg = packages[name];
			if (!(pkg.name in seen)) {
				seen[pkg.name] = true;
				meta = pkg.metadata;
				extName = meta.rave && (typeof meta.rave === 'string'
					? meta.rave
					: meta.rave.extension);
				if (extName) {
					raveSemver = meta.dependencies && meta.dependencies.rave
						|| meta.peerDependencies && meta.peerDependencies.rave;
					satisfies = semver && semver.satisfies(currVer, raveSemver);
					info = {
						extName: meta.name,
						raveSemver: raveSemver,
						bugsLink: findBugsLink(meta) || ''
					};
					if (!raveSemver) {
						console.log(render(info, semverMissing));
					}
					else if (!semver) {
						console.log(render(info, semverInfo));
					}
					else if (satisfies) {
						console.log(render(info, semverValid));
					}
					else {
						console.log(render(info, semverInvalid));
					}
				}
			}
		}
		console.log('\n' + updateDepsInstructions);
	}
	function noSemver () {
		console.log(semverNotInstalled);
		runSemver();
	}
}

function findBugsLink (meta) {
	var link = '';
	if (meta.bugs) {
		link = typeof meta.bugs === 'string'
			? meta.bugs
			: meta.bugs.url || meta.bugs.email;
	}
	if (!link && meta.homepage) {
		link = meta.homepage;
	}
	if (!link && meta.maintainers) {
		link = findPersonLink(meta.maintainers[0]);
	}
	if (!link && meta.contributors) {
		link = findPersonLink(meta.contributors[0]);
	}
	if (!link && meta.authors) {
		link = findPersonLink(meta.authors[0]);
	}
	if (!link && meta.author) {
		link = findPersonLink(meta.author);
	}
	return link;
}

function findPersonLink (person) {
	if (typeof person === 'string') {
		return person;
	}
	else {
		return person.url || person.web || person.homepage || person.email;
	}
}
