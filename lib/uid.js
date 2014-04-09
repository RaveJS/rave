exports.create = createUid;
exports.parse = parseUid;

function createUid (descriptor, normalized) {
	return /*descriptor.metaType + ':' +*/ descriptor.name
		+ (descriptor.version ? '@' + descriptor.version : '')
		+ (normalized ? '#' + normalized : '');
}

function parseUid (uid) {
	var uparts = uid.split('#');
	var name = uparts.pop();
	var nparts = name.split('/');
	return {
		name: name,
		pkgName: nparts.shift(),
		modulePath: nparts.join('/'),
		pkgUid: uparts[0]
	}
}
