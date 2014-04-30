var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var specificity = require('../../load/specificity');

buster.testCase('specificity', {

	'compare': {
		'should compare packages before anything else': function () {
			var hasPkg = { package: 'foo' };
			var hasPat = { pattern: 'foo' };
			var hasExt = { extensions: ['foo', 'bar'] };
			var hasPred = { predicate: function () {} };
			assert(specificity.compare(hasPkg, hasPat) < 0, 'package wins over pattern');
			assert(specificity.compare(hasPkg, hasExt) < 0, 'package wins over extensions');
			assert(specificity.compare(hasPkg, hasPred) < 0, 'package wins over predicate');
		},
		'should compare pattern if packages are of same specificity': function () {
			var hasPkg = { package: 'foo' };
			var hasPkgPat = { package: 'foo', pattern: 'foo' };
			assert(specificity.compare(hasPkg, hasPkgPat) > 0);
		},
		'should compare extensions if packages and patterns are of same specificity': function () {
			var hasPkgPat = { package: 'foo', pattern: 'foo' };
			var hasPkgPatExt = { package: 'foo', pattern: 'foo', extensions: ['foo', 'bar'] };
			assert(specificity.compare(hasPkgPat, hasPkgPatExt) > 0);
		},
		'should compare predicates if packages, patterns, and extensions are of same specificity': function () {
			var hasPkgPatExt = { package: 'foo', pattern: 'foo', extensions: ['foo', 'bar'] };
			var hasPkgPatExtPred = { package: 'foo', pattern: 'foo', extensions: ['foo', 'bar'], predicate: function () {} };
			assert(specificity.compare(hasPkgPatExt, hasPkgPatExtPred) > 0);
		},
		'should return zero for identical specificities': function () {
			// TODO: use a test generator for better coverage
			var hasPkg = { package: 'foo' };
			var hasPat = { pattern: 'foo' };
			var hasExt = { extensions: ['foo', 'bar'] };
			var hasPred = { predicate: function () {} };
			var hasPkgPat = { package: 'foo', pattern: 'foo' };
			var hasPkgPatExt = { package: 'foo', pattern: 'foo', extensions: ['foo', 'bar'] };
			var hasPatExt = { pattern: 'foo', extensions: ['foo', 'bar'] };
			var hasPkgExt = { package: 'foo', extensions: ['foo', 'bar'] };
			var hasPkgPatExtPred = { package: 'foo', pattern: 'foo', extensions: ['foo', 'bar'], predicate: function () {} };
			var hasPkgExtPred = { package: 'foo', extensions: ['foo', 'bar'], predicate: function () {} };
			var hasPkgPatPred = { package: 'foo', pattern: 'foo', predicate: function () {} };
			assert.equals(0, specificity.compare(hasPkg, hasPkg), 'same package');
			assert.equals(0, specificity.compare(hasPat, hasPat), 'same pattern');
			assert.equals(0, specificity.compare(hasExt, hasExt), 'same extensions');
			assert.equals(0, specificity.compare(hasPred, hasPred), 'same predicate');
			assert.equals(0, specificity.compare(hasPkgPat, hasPkgPat), 'same package and pattern');
			assert.equals(0, specificity.compare(hasPkgPatExt, hasPkgPatExt), 'same package, pattern, and extensions');
			assert.equals(0, specificity.compare(hasPatExt, hasPatExt), 'same pattern and extensions');
			assert.equals(0, specificity.compare(hasPkgExt, hasPkgExt), 'same package and extensions');
			assert.equals(0, specificity.compare(hasPkgPatExtPred, hasPkgPatExtPred), 'same package, pattern, extensions, and predicate');
			assert.equals(0, specificity.compare(hasPkgExtPred, hasPkgExtPred), 'same package, extensions, and predicate');
			assert.equals(0, specificity.compare(hasPkgPatPred, hasPkgPatPred), 'same package, pattern, and predicate');
		}
	},

	'pkgSpec': {
		'should return zero for no package or wildcard package': function () {
			assert.equals(0, specificity.pkgSpec({ package: '*' }), 'wildcard');
			assert.equals(0, specificity.pkgSpec({}), 'package is not defined');
			assert.equals(0, specificity.pkgSpec({ package: 0 }), 'falsey package, 0');
			assert.equals(0, specificity.pkgSpec({ package: '' }), 'falsey package, ""');
			assert.equals(0, specificity.pkgSpec({ package: false }), 'falsey package, false');
		},
		'should return a larger number for a named package': function () {
			assert(specificity.pkgSpec({ package: 'foo' }) >= specificity.pkgSpec({}));
		}
	},

	'patSpec': {
		'should return zero when there is no pattern': function () {
			assert.equals(0, specificity.patSpec({}), 'pattern is not defined');
			assert.equals(0, specificity.patSpec({ pattern: 0 }), 'pattern is falsey, 0');
			assert.equals(0, specificity.patSpec({ pattern: '' }), 'pattern is falsey, ""');
			assert.equals(0, specificity.patSpec({ pattern: false }), 'pattern is falsey, false');
		},
		'should return a larger number when pattern is defined': function () {
			assert(specificity.patSpec({ pattern: 'foo' }) > specificity.patSpec({}));
		}
	},

	'extSpec': {
		'should return zero when there are no extensions': function () {
			assert.equals(0, specificity.extSpec({}), 'extensions is not defined');
			assert.equals(0, specificity.extSpec({ extensions: [] }), 'extensions is zero length');
			assert.equals(0, specificity.extSpec({ pattern: 0 }), 'extensions is falsey, 0');
			assert.equals(0, specificity.extSpec({ pattern: '' }), 'extensions is falsey, ""');
			assert.equals(0, specificity.extSpec({ pattern: false }), 'extensions is falsey, false');
		},
		'should return a larger number for fewer, non-zero extensions lengths': function () {
			var oneExtension = { extensions: ['foo'] };
			var twoExtensions = { extensions: ['foo', 'bar'] }
			var threeExtensions = { extensions: ['foo', 'bar', 'baz'] };
			assert(specificity.extSpec(oneExtension) > specificity.extSpec(twoExtensions), '1 vs 2');
			assert(specificity.extSpec(threeExtensions) < specificity.extSpec(twoExtensions), '3 vs 2');
		}
	},

	'predSpec': {
		'should return zero when there is no predicate': function () {
			assert.equals(0, specificity.predSpec({}), 'predicate is not defined');
			assert.equals(0, specificity.predSpec({ pattern: 0 }), 'predicate is falsey, 0');
			assert.equals(0, specificity.predSpec({ pattern: '' }), 'predicate is falsey, ""');
			assert.equals(0, specificity.predSpec({ pattern: false }), 'predicate is falsey, false');
		},
		'should return a larger number when there is a predicate': function () {
			assert(specificity.predSpec({ predicate: function () {} }) > specificity.extSpec({}));
		}
	}

});

function clone (obj) {
	var clone = {};
	for (var p in obj) clone[p] = obj[p];
	return clone;
}
