var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var filter = require('../../load/predicate');

buster.testCase('predicate', {

	'composePredicates': {
		'should compose a function that calls matchPackage predicate when package property is present': function () {
			var matchPackage = this.spy();
			var matchPattern = this.spy();
			var matchExtension = this.spy();
			var f = { package: 'foo' };
			var predicate = filter.composePredicates(matchPackage, matchPattern, matchExtension, f);
			assert.isFunction(predicate);
			predicate();
			assert.calledOnce(matchPackage);
			refute.called(matchPattern);
			refute.called(matchExtension);
		},
		'should compose a function that calls matchPattern predicate when pattern property is present': function () {
			var matchPackage = this.spy();
			var matchPattern = this.spy();
			var matchExtension = this.spy();
			var f = { pattern: 'foo' };
			var predicate = filter.composePredicates(matchPackage, matchPattern, matchExtension, f);
			assert.isFunction(predicate);
			predicate();
			assert.calledOnce(matchPattern);
			refute.called(matchPackage);
			refute.called(matchExtension);
		},
		'should compose a function that calls matchExtensions predicate when extensions property is present': function () {
			var matchPackage = this.spy();
			var matchPattern = this.spy();
			var matchExtension = this.spy();
			var f = { extensions: ['foo'] };
			var predicate = filter.composePredicates(matchPackage, matchPattern, matchExtension, f);
			assert.isFunction(predicate);
			predicate();
			assert.calledOnce(matchExtension);
			refute.called(matchPackage);
			refute.called(matchPattern);
		},
		'should compose a function that calls the predicate when predicate property is present': function () {
			var matchPackage = this.spy();
			var matchPattern = this.spy();
			var matchExtension = this.spy();
			var f = { predicate: this.spy() };
			var predicate = filter.composePredicates(matchPackage, matchPattern, matchExtension, f);
			assert.isFunction(predicate);
			predicate();
			assert.calledOnce(f.predicate);
			refute.called(matchPackage);
			refute.called(matchPattern);
			refute.called(matchExtension);
		},
		'should compose a function that calls all predicates when all are present and return truthy': function () {
			var matchPackage = this.spy(truthy);
			var matchPattern = this.spy(truthy);
			var matchExtension = this.spy(truthy);
			var f = { package: 'foo', pattern: 'foo', extensions: ['foo'], predicate: this.spy(truthy) };
			var predicate = filter.composePredicates(matchPackage, matchPattern, matchExtension, f);
			assert.isFunction(predicate);
			predicate();
			assert.calledOnce(matchPackage, 'package');
			assert.calledOnce(matchPattern, 'pattern');
			assert.calledOnce(matchExtension, 'extensions');
			assert.calledOnce(f.predicate, 'predicate');
		},
		'should compose a function that stops calling predicates when one returns falsey': function () {
			var matchPackage = this.spy();
			var matchPattern = this.spy(truthy);
			var matchExtension = this.spy(truthy);
			var f = { package: 'foo', pattern: 'foo', extensions: ['foo'], predicate: this.spy(truthy) };
			var predicate = filter.composePredicates(matchPackage, matchPattern, matchExtension, f);
			assert.isFunction(predicate);
			predicate();
			assert.calledOnce(matchPackage, 'package');
			refute.calledOnce(matchPattern, 'pattern');
			refute.calledOnce(matchExtension, 'extensions');
			refute.calledOnce(f.predicate, 'predicate');
		}
	},

	'createPackageMatcher': {
		'should create a function that calls samePackage and passes a package property': function () {
			var samePackage = this.spy(truthy);
			var f = { package: 'foo' };
			var matcher = filter.createPackageMatcher(samePackage, f);
			var result = matcher({ name: 'bar' });
			assert.calledWith(samePackage, 'bar', 'foo');
			assert(result);
		}
	},

	'createPatternMatcher': {
		'should create a function that checks a regexp against a string': function () {
			var f = { pattern: /^foo$/ };
			var matcher = filter.createPatternMatcher(f);
			var result = matcher({ name: 'foo' });
			assert(result);
		},
		'should work with a string pattern instead of a RegExp': function () {
			var f = { pattern: '^foo$' };
			var matcher = filter.createPatternMatcher(f);
			var result = matcher({ name: 'foo' });
			assert(result);
		}
	},

	'createExtensionsMatcher': {
		'should create a function that checks if a string ends in one or more extensions': function () {
			var f = { extensions: [ '.js', '.javascript' ] };
			var matcher = filter.createExtensionsMatcher(f);
			assert(matcher({ name: 'foo/bar.js' }));
			assert(matcher({ name: 'foo/bar.javascript' }));
			refute(matcher({ name: 'foo/bar.css' }));
		},
		'should also work if extensions don\'t start with a dot': function () {
			var f = { extensions: [ 'js', 'javascript' ] };
			var matcher = filter.createExtensionsMatcher(f);
			assert(matcher({ name: 'foo/bar.js' }));
			assert(matcher({ name: 'foo/bar.javascript' }));
			refute(matcher({ name: 'foo/bar.css' }));
		}
	}

});


function truthy () { return true; }
