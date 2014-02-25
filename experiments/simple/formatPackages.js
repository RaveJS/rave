module.exports = formatPackages;

function formatPackages (packages) {
	return JSON.stringify(Object.keys(packages), null, '    ');
}
