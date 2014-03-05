var buster = require('buster');
var assert = buster.assert;
var refute = buster.refute;
var fail = buster.assertions.fail;

var fetchText = require('../../lib/fetchText');

buster.testCase('fetchText', {

	'should be a function': function () {
		assert.isFunction(fetchText);
	},

	'should use XHR GET': function () {
		var saveXHR = typeof XMLHttpRequest !== 'undefined' && XMLHttpRequest;
		var cb, eb;
		var xhr = mockXhr.call(this);;
		try {
			cb = this.spy();
			eb = this.spy();
			XMLHttpRequest = function () { return xhr; };
			fetchText('url', cb, eb);
			// assert XHR GET called correctly
			assert.calledWithExactly(xhr.open, 'GET', 'url', true);
			assert.calledWithExactly(xhr.send, null);
			// assert callback is called
			xhr.readyState = 4;
			xhr.responseText = 'foo';
			xhr.status = 200;
			xhr.onreadystatechange();
			assert.calledWithExactly(cb, 'foo');
			refute.called(eb);
			// assert errback is called
			cb.reset();
			eb.reset();
			xhr.status = 400;
			xhr.onreadystatechange();
			assert.called(eb);
			refute.called(cb);
		}
		finally {
			if (saveXHR) XMLHttpRequest = saveXHR;
		}
	}

});

function mockXhr () {
	return {
		open: this.spy(),
		send: this.spy()
	};
}
