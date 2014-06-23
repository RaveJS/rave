var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;

var createCodeFinder = require('../../lib/find/createCodeFinder');

var testSource = 'module.exports = function foo () { /* alert("moo"); */ alert("foo"); alert("bar"); }';

buster.testCase('lib/find/createCodeFinder', {

	createCodeFinder: {
		'should create a function': function () {
			assert.isFunction(createCodeFinder(/ /));
		},
		'should find a simple code snippet': function () {
			var finder = createCodeFinder(/alert/);
			var count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 2);
		},
		'should ignore text inside strings and comments': function () {
			var finder = createCodeFinder(/bar/);
			var count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 0, 'bar');
			finder = createCodeFinder(/foo/);
			count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 1, 'foo');
			finder = createCodeFinder(/moo/);
			count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 0, 'foo');
		},
		'// should ignore text inside RegExps': function () {
			// TODO
		},
		'should find a code snippet with a string, if requested': function () {
			var finder = createCodeFinder(/alert\("foo"\);/);
			var count = 0;
			finder(testSource, function () { count++; });
			assert.same(count, 1, 'alert("foo");');
		}
	},

	checkStateChange: {
		'should set inSource flag to false if already in a comment or quote': function () {
			var state = {};
			var transitions = [];
			state.inComment = true;
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inSource, 'in a comment');
			state.inQuote = true;
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inSource, 'in a quote');
		},
		'should set inSource flag to false if entering a comment or quote': function () {
			var state = {};
			var transitions = [];
			transitions[2] = '//';
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inSource, 'entering a comment');
			transitions[1] = '"';
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inSource, 'entering a quote');
		},
		'should set inComment state to false if leaving comment': function () {
			var state = { inComment: '\n' };
			var transitions = [];
			transitions[3] = '\n';
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inComment, 'leaving a line comment');
			state.inComment = '*/';
			transitions[3] = '*/';
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inComment, 'leaving a block comment');
		},
		'should set inQuote state to false if leaving quote': function () {
			var state = { inQuote: '"' };
			var transitions = [];
			transitions[1] = '"';
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inQuote, 'leaving a double quote');
			state.inQuote = "'";
			transitions[1] = "'";
			createCodeFinder.checkStateChange(state, transitions);
			refute(state.inQuote, 'leaving a quote');
		},
		'should set inSource flag to true if not entering other state': function () {
			var state = {};
			var transitions = [];
			createCodeFinder.checkStateChange(state, transitions);
			assert(state.inUserMatch, 'indicate user match');
		},
		'// should text more combinations of states and transitions': function () {}
	},

	composeRx: {
		'should compose two RegExps together': function () {
			var combo = createCodeFinder.composeRx(/foo/, /bar/, 'g');
			assert.same(combo.toString(), '/foo|bar/g');
		},
		'should add flags to resulting RegExp': function () {
			var combo = createCodeFinder.composeRx(/foo/, /bar/, 'gim');
			assert.same(combo.toString().slice(-3), 'gim');
		}
	},

	rxStringContents: {
		'should remove only leading and trailing slashes from a RegExp.totring()': function () {
			var rx = /foo\/bar/;
			assert.same(createCodeFinder.rxStringContents(rx), 'foo\\/bar');
		},
		'should remove trailing options RegExp.totring()': function () {
			var rx = /foo|bar/gim;
			assert.same(createCodeFinder.rxStringContents(rx), 'foo|bar');
		}
	}

});
