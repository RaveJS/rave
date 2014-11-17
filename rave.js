!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.Promise=e():"undefined"!=typeof global?global.Promise=e():"undefined"!=typeof self&&(self.Promise=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * ES6 global Promise shim
 */
var unhandledRejections = require('../lib/decorators/unhandledRejection');
var PromiseConstructor = unhandledRejections(require('../lib/Promise'));

module.exports = typeof global != 'undefined' ? (global.Promise = PromiseConstructor)
	           : typeof self   != 'undefined' ? (self.Promise   = PromiseConstructor)
	           : PromiseConstructor;

},{"../lib/Promise":2,"../lib/decorators/unhandledRejection":6}],2:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./Scheduler');
	var async = require('./async');

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./Scheduler":4,"./async":5,"./makePromise":7}],3:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {
	/**
	 * Circular queue
	 * @param {number} capacityPow2 power of 2 to which this queue's capacity
	 *  will be set initially. eg when capacityPow2 == 3, queue capacity
	 *  will be 8.
	 * @constructor
	 */
	function Queue(capacityPow2) {
		this.head = this.tail = this.length = 0;
		this.buffer = new Array(1 << capacityPow2);
	}

	Queue.prototype.push = function(x) {
		if(this.length === this.buffer.length) {
			this._ensureCapacity(this.length * 2);
		}

		this.buffer[this.tail] = x;
		this.tail = (this.tail + 1) & (this.buffer.length - 1);
		++this.length;
		return this.length;
	};

	Queue.prototype.shift = function() {
		var x = this.buffer[this.head];
		this.buffer[this.head] = void 0;
		this.head = (this.head + 1) & (this.buffer.length - 1);
		--this.length;
		return x;
	};

	Queue.prototype._ensureCapacity = function(capacity) {
		var head = this.head;
		var buffer = this.buffer;
		var newBuffer = new Array(capacity);
		var i = 0;
		var len;

		if(head === 0) {
			len = this.length;
			for(; i<len; ++i) {
				newBuffer[i] = buffer[i];
			}
		} else {
			capacity = buffer.length;
			len = this.tail;
			for(; head<capacity; ++i, ++head) {
				newBuffer[i] = buffer[head];
			}

			for(head=0; head<len; ++i, ++head) {
				newBuffer[i] = buffer[head];
			}
		}

		this.buffer = newBuffer;
		this.head = 0;
		this.tail = this.length;
	};

	return Queue;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],4:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var Queue = require('./Queue');

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	/**
	 * Async task scheduler
	 * @param {function} async function to schedule a single async function
	 * @constructor
	 */
	function Scheduler(async) {
		this._async = async;
		this._queue = new Queue(15);
		this._afterQueue = new Queue(5);
		this._running = false;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._add(this._queue, task);
	};

	/**
	 * Enqueue a task to run after the main task queue
	 * @param {{ run:function }} task
	 */
	Scheduler.prototype.afterQueue = function(task) {
		this._add(this._afterQueue, task);
	};

	/**
	 * Drain the handler queue entirely, and then the after queue
	 */
	Scheduler.prototype._drain = function() {
		runQueue(this._queue);
		this._running = false;
		runQueue(this._afterQueue);
	};

	/**
	 * Add a task to the q, and schedule drain if not already scheduled
	 * @param {Queue} queue
	 * @param {{run:function}} task
	 * @private
	 */
	Scheduler.prototype._add = function(queue, task) {
		queue.push(task);
		if(!this._running) {
			this._running = true;
			this._async(this.drain);
		}
	};

	/**
	 * Run all the tasks in the q
	 * @param queue
	 */
	function runQueue(queue) {
		while(queue.length > 0) {
			queue.shift().run();
		}
	}

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"./Queue":3}],5:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	// Sniff "best" async scheduling option
	// Prefer process.nextTick or MutationObserver, then check for
	// vertx and finally fall back to setTimeout

	/*jshint maxcomplexity:6*/
	/*global process,document,setTimeout,MutationObserver,WebKitMutationObserver*/
	var nextTick, MutationObs;

	if (typeof process !== 'undefined' && process !== null &&
		typeof process.nextTick === 'function') {
		nextTick = function(f) {
			process.nextTick(f);
		};

	} else if (MutationObs =
		(typeof MutationObserver === 'function' && MutationObserver) ||
		(typeof WebKitMutationObserver === 'function' && WebKitMutationObserver)) {
		nextTick = (function (document, MutationObserver) {
			var scheduled;
			var el = document.createElement('div');
			var o = new MutationObserver(run);
			o.observe(el, { attributes: true });

			function run() {
				var f = scheduled;
				scheduled = void 0;
				f();
			}

			return function (f) {
				scheduled = f;
				el.setAttribute('class', 'x');
			};
		}(document, MutationObs));

	} else {
		nextTick = (function(cjsRequire) {
			var vertx;
			try {
				// vert.x 1.x || 2.x
				vertx = cjsRequire('vertx');
			} catch (ignore) {}

			if (vertx) {
				if (typeof vertx.runOnLoop === 'function') {
					return vertx.runOnLoop;
				}
				if (typeof vertx.runOnContext === 'function') {
					return vertx.runOnContext;
				}
			}

			// capture setTimeout to avoid being caught by fake timers
			// used in time based tests
			var capturedSetTimeout = setTimeout;
			return function (t) {
				capturedSetTimeout(t, 0);
			};
		}(require));
	}

	return nextTick;
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{}],6:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var timer = require('../timer');

	return function unhandledRejection(Promise) {
		var logError = noop;
		var logInfo = noop;

		if(typeof console !== 'undefined') {
			logError = typeof console.error !== 'undefined'
				? function (e) { console.error(e); }
				: function (e) { console.log(e); };

			logInfo = typeof console.info !== 'undefined'
				? function (e) { console.info(e); }
				: function (e) { console.log(e); };
		}

		Promise.onPotentiallyUnhandledRejection = function(rejection) {
			enqueue(report, rejection);
		};

		Promise.onPotentiallyUnhandledRejectionHandled = function(rejection) {
			enqueue(unreport, rejection);
		};

		Promise.onFatalRejection = function(rejection) {
			enqueue(throwit, rejection.value);
		};

		var tasks = [];
		var reported = [];
		var running = false;

		function report(r) {
			if(!r.handled) {
				reported.push(r);
				logError('Potentially unhandled rejection [' + r.id + '] ' + formatError(r.value));
			}
		}

		function unreport(r) {
			var i = reported.indexOf(r);
			if(i >= 0) {
				reported.splice(i, 1);
				logInfo('Handled previous rejection [' + r.id + '] ' + formatObject(r.value));
			}
		}

		function enqueue(f, x) {
			tasks.push(f, x);
			if(!running) {
				running = true;
				running = timer.set(flush, 0);
			}
		}

		function flush() {
			running = false;
			while(tasks.length > 0) {
				tasks.shift()(tasks.shift());
			}
		}

		return Promise;
	};

	function formatError(e) {
		var s = typeof e === 'object' && e.stack ? e.stack : formatObject(e);
		return e instanceof Error ? s : s + ' (WARNING: non-Error used)';
	}

	function formatObject(o) {
		var s = String(o);
		if(s === '[object Object]' && typeof JSON !== 'undefined') {
			s = tryStringify(o, s);
		}
		return s;
	}

	function tryStringify(e, defaultValue) {
		try {
			return JSON.stringify(e);
		} catch(e) {
			// Ignore. Cannot JSON.stringify e, stick with String(e)
			return defaultValue;
		}
	}

	function throwit(e) {
		throw e;
	}

	function noop() {}

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"../timer":8}],7:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function() {

	return function makePromise(environment) {

		var tasks = environment.scheduler;

		var objectCreate = Object.create ||
			function(proto) {
				function Child() {}
				Child.prototype = proto;
				return new Child();
			};

		/**
		 * Create a promise whose fate is determined by resolver
		 * @constructor
		 * @returns {Promise} promise
		 * @name Promise
		 */
		function Promise(resolver, handler) {
			this._handler = resolver === Handler ? handler : init(resolver);
		}

		/**
		 * Run the supplied resolver
		 * @param resolver
		 * @returns {Pending}
		 */
		function init(resolver) {
			var handler = new Pending();

			try {
				resolver(promiseResolve, promiseReject, promiseNotify);
			} catch (e) {
				promiseReject(e);
			}

			return handler;

			/**
			 * Transition from pre-resolution state to post-resolution state, notifying
			 * all listeners of the ultimate fulfillment or rejection
			 * @param {*} x resolution value
			 */
			function promiseResolve (x) {
				handler.resolve(x);
			}
			/**
			 * Reject this promise with reason, which will be used verbatim
			 * @param {Error|*} reason rejection reason, strongly suggested
			 *   to be an Error type
			 */
			function promiseReject (reason) {
				handler.reject(reason);
			}

			/**
			 * @deprecated
			 * Issue a progress event, notifying all progress listeners
			 * @param {*} x progress event payload to pass to all listeners
			 */
			function promiseNotify (x) {
				handler.notify(x);
			}
		}

		// Creation

		Promise.resolve = resolve;
		Promise.reject = reject;
		Promise.never = never;

		Promise._defer = defer;
		Promise._handler = getHandler;

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new Async(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new Async(new Rejected(x)));
		}

		/**
		 * Return a promise that remains pending forever
		 * @returns {Promise} forever-pending promise.
		 */
		function never() {
			return foreverPendingPromise; // Should be frozen
		}

		/**
		 * Creates an internal {promise, resolver} pair
		 * @private
		 * @returns {Promise}
		 */
		function defer() {
			return new Promise(Handler, new Pending());
		}

		// Transformation and flow control

		/**
		 * Transform this promise's fulfillment value, returning a new Promise
		 * for the transformed result.  If the promise cannot be fulfilled, onRejected
		 * is called with the reason.  onProgress *may* be called with updates toward
		 * this promise's fulfillment.
		 * @param {function=} onFulfilled fulfillment handler
		 * @param {function=} onRejected rejection handler
		 * @deprecated @param {function=} onProgress progress handler
		 * @return {Promise} new promise
		 */
		Promise.prototype.then = function(onFulfilled, onRejected) {
			var parent = this._handler;
			var state = parent.join().state();

			if ((typeof onFulfilled !== 'function' && state > 0) ||
				(typeof onRejected !== 'function' && state < 0)) {
				// Short circuit: value will not change, simply share handler
				return new this.constructor(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.chain(child, parent.receiver, onFulfilled, onRejected,
					arguments.length > 2 ? arguments[2] : void 0);

			return p;
		};

		/**
		 * If this promise cannot be fulfilled due to an error, call onRejected to
		 * handle the error. Shortcut for .then(undefined, onRejected)
		 * @param {function?} onRejected
		 * @return {Promise}
		 */
		Promise.prototype['catch'] = function(onRejected) {
			return this.then(void 0, onRejected);
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			var parent = this._handler;
			var child = new Pending(parent.receiver, parent.join().context);
			return new this.constructor(Handler, child);
		};

		// Array combinators

		Promise.all = all;
		Promise.race = race;

		/**
		 * Return a promise that will fulfill when all promises in the
		 * input array have fulfilled, or will reject when one of the
		 * promises rejects.
		 * @param {array} promises array of promises
		 * @returns {Promise} promise for array of fulfillment values
		 */
		function all(promises) {
			/*jshint maxcomplexity:8*/
			var resolver = new Pending();
			var pending = promises.length >>> 0;
			var results = new Array(pending);

			var i, h, x, s;
			for (i = 0; i < promises.length; ++i) {
				x = promises[i];

				if (x === void 0 && !(i in promises)) {
					--pending;
					continue;
				}

				if (maybeThenable(x)) {
					h = getHandlerMaybeThenable(x);

					s = h.state();
					if (s === 0) {
						h.fold(settleAt, i, results, resolver);
					} else if (s > 0) {
						results[i] = h.value;
						--pending;
					} else {
						resolveAndObserveRemaining(promises, i+1, h, resolver);
						break;
					}

				} else {
					results[i] = x;
					--pending;
				}
			}

			if(pending === 0) {
				resolver.become(new Fulfilled(results));
			}

			return new Promise(Handler, resolver);

			function settleAt(i, x, resolver) {
				/*jshint validthis:true*/
				this[i] = x;
				if(--pending === 0) {
					resolver.become(new Fulfilled(this));
				}
			}
		}

		function resolveAndObserveRemaining(promises, start, handler, resolver) {
			resolver.become(handler);

			var i, h, x;
			for(i=start; i<promises.length; ++i) {
				x = promises[i];
				if(maybeThenable(x)) {
					h = getHandlerMaybeThenable(x);
					if(h !== handler) {
						h.visit(h, void 0, h._unreport);
					}
				}
			}
		}

		/**
		 * Fulfill-reject competitive race. Return a promise that will settle
		 * to the same state as the earliest input promise to settle.
		 *
		 * WARNING: The ES6 Promise spec requires that race()ing an empty array
		 * must return a promise that is pending forever.  This implementation
		 * returns a singleton forever-pending promise, the same singleton that is
		 * returned by Promise.never(), thus can be checked with ===
		 *
		 * @param {array} promises array of promises to race
		 * @returns {Promise} if input is non-empty, a promise that will settle
		 * to the same outcome as the earliest input promise to settle. if empty
		 * is empty, returns a promise that will never settle.
		 */
		function race(promises) {
			// Sigh, race([]) is untestable unless we return *something*
			// that is recognizable without calling .then() on it.
			if(Object(promises) === promises && promises.length === 0) {
				return never();
			}

			var resolver = new Pending();
			var i, x, h;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x === void 0 && !(i in promises)) {
					continue;
				}

				h = getHandler(x);
				if(h.state() !== 0) {
					resolveAndObserveRemaining(promises, i+1, h, resolver);
					break;
				}

				h.visit(resolver, resolver.resolve, resolver.reject);
			}
			return new Promise(Handler, resolver);
		}

		// Promise internals
		// Below this, everything is @private

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new Fulfilled(x);
		}

		/**
		 * Get a handler for thenable x.
		 * NOTE: You must only call this if maybeThenable(x) == true
		 * @param {object|function|Promise} x
		 * @returns {object} handler
		 */
		function getHandlerMaybeThenable(x) {
			return isPromise(x) ? x._handler.join() : getHandlerUntrusted(x);
		}

		/**
		 * Get a handler for potentially untrusted thenable x
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandlerUntrusted(x) {
			try {
				var untrustedThen = x.then;
				return typeof untrustedThen === 'function'
					? new Thenable(untrustedThen, x)
					: new Fulfilled(x);
			} catch(e) {
				return new Rejected(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.become
			= Handler.prototype.notify // deprecated
			= Handler.prototype.fail
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype._state = 0;

		Handler.prototype.state = function() {
			return this._state;
		};

		/**
		 * Recursively collapse handler chain to find the handler
		 * nearest to the fully resolved value.
		 * @returns {object} handler nearest the fully resolved value
		 */
		Handler.prototype.join = function() {
			var h = this;
			while(h.handler !== void 0) {
				h = h.handler;
			}
			return h;
		};

		Handler.prototype.chain = function(to, receiver, fulfilled, rejected, progress) {
			this.when({
				resolver: to,
				receiver: receiver,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.visit = function(receiver, fulfilled, rejected, progress) {
			this.chain(failIfRejected, receiver, fulfilled, rejected, progress);
		};

		Handler.prototype.fold = function(f, z, c, to) {
			this.visit(to, function(x) {
				f.call(c, z, x, this);
			}, to.reject, to.notify);
		};

		/**
		 * Handler that invokes fail() on any handler it becomes
		 * @constructor
		 */
		function FailIfRejected() {}

		inherit(Handler, FailIfRejected);

		FailIfRejected.prototype.become = function(h) {
			h.fail();
		};

		var failIfRejected = new FailIfRejected();

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @constructor
		 */
		function Pending(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, Pending);

		Pending.prototype._state = 0;

		Pending.prototype.resolve = function(x) {
			this.become(getHandler(x));
		};

		Pending.prototype.reject = function(x) {
			if(this.resolved) {
				return;
			}

			this.become(new Rejected(x));
		};

		Pending.prototype.join = function() {
			if (!this.resolved) {
				return this;
			}

			var h = this;

			while (h.handler !== void 0) {
				h = h.handler;
				if (h === this) {
					return this.handler = cycle();
				}
			}

			return h;
		};

		Pending.prototype.run = function() {
			var q = this.consumers;
			var handler = this.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		Pending.prototype.become = function(handler) {
			if(this.resolved) {
				return;
			}

			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		Pending.prototype.when = function(continuation) {
			if(this.resolved) {
				tasks.enqueue(new ContinuationTask(continuation, this.handler));
			} else {
				if(this.consumers === void 0) {
					this.consumers = [continuation];
				} else {
					this.consumers.push(continuation);
				}
			}
		};

		/**
		 * @deprecated
		 */
		Pending.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(x, this));
			}
		};

		Pending.prototype.fail = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join().fail(c);
		};

		Pending.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		Pending.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @param {object} handler
		 * @constructor
		 */
		function Async(handler) {
			this.handler = handler;
		}

		inherit(Handler, Async);

		Async.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this));
		};

		Async.prototype._report = function(context) {
			this.join()._report(context);
		};

		Async.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function Thenable(then, thenable) {
			Pending.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(Pending, Thenable);

		/**
		 * Handler for a fulfilled promise
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function Fulfilled(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, Fulfilled);

		Fulfilled.prototype._state = 1;

		Fulfilled.prototype.fold = function(f, z, c, to) {
			runContinuation3(f, z, this, c, to);
		};

		Fulfilled.prototype.when = function(cont) {
			runContinuation1(cont.fulfilled, this, cont.receiver, cont.resolver);
		};

		var errorId = 0;

		/**
		 * Handler for a rejected promise
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function Rejected(x) {
			Promise.createContext(this);

			this.id = ++errorId;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, Rejected);

		Rejected.prototype._state = -1;

		Rejected.prototype.fold = function(f, z, c, to) {
			to.become(this);
		};

		Rejected.prototype.when = function(cont) {
			if(typeof cont.rejected === 'function') {
				this._unreport();
			}
			runContinuation1(cont.rejected, this, cont.receiver, cont.resolver);
		};

		Rejected.prototype._report = function(context) {
			tasks.afterQueue(new ReportTask(this, context));
		};

		Rejected.prototype._unreport = function() {
			this.handled = true;
			tasks.afterQueue(new UnreportTask(this));
		};

		Rejected.prototype.fail = function(context) {
			Promise.onFatalRejection(this, context === void 0 ? this.context : context);
		};

		function ReportTask(rejection, context) {
			this.rejection = rejection;
			this.context = context;
		}

		ReportTask.prototype.run = function() {
			if(!this.rejection.handled) {
				this.rejection.reported = true;
				Promise.onPotentiallyUnhandledRejection(this.rejection, this.context);
			}
		};

		function UnreportTask(rejection) {
			this.rejection = rejection;
		}

		UnreportTask.prototype.run = function() {
			if(this.rejection.reported) {
				Promise.onPotentiallyUnhandledRejectionHandled(this.rejection);
			}
		};

		// Unhandled rejection hooks
		// By default, everything is a noop

		// TODO: Better names: "annotate"?
		Promise.createContext
			= Promise.enterContext
			= Promise.exitContext
			= Promise.onPotentiallyUnhandledRejection
			= Promise.onPotentiallyUnhandledRejectionHandled
			= Promise.onFatalRejection
			= noop;

		// Errors and singletons

		var foreverPendingHandler = new Handler();
		var foreverPendingPromise = new Promise(Handler, foreverPendingHandler);

		function cycle() {
			return new Rejected(new TypeError('Promise cycle'));
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @constructor
		 */
		function ContinuationTask(continuation, handler) {
			this.continuation = continuation;
			this.handler = handler;
		}

		ContinuationTask.prototype.run = function() {
			this.handler.join().when(this.continuation);
		};

		/**
		 * Run a queue of progress handlers
		 * @constructor
		 */
		function ProgressTask(value, handler) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}

			for (var c, i = 0; i < q.length; ++i) {
				c = q[i];
				runNotify(c.progress, this.value, this.handler, c.receiver, c.resolver);
			}
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @param {function} then
		 * @param {object|function} thenable
		 * @param {object} resolver
		 * @constructor
		 */
		function AssimilateTask(then, thenable, resolver) {
			this._then = then;
			this.thenable = thenable;
			this.resolver = resolver;
		}

		AssimilateTask.prototype.run = function() {
			var h = this.resolver;
			tryAssimilate(this._then, this.thenable, _resolve, _reject, _notify);

			function _resolve(x) { h.resolve(x); }
			function _reject(x)  { h.reject(x); }
			function _notify(x)  { h.notify(x); }
		};

		function tryAssimilate(then, thenable, resolve, reject, notify) {
			try {
				then.call(thenable, resolve, reject, notify);
			} catch (e) {
				reject(e);
			}
		}

		// Other helpers

		/**
		 * @param {*} x
		 * @returns {boolean} true iff x is a trusted Promise
		 */
		function isPromise(x) {
			return x instanceof Promise;
		}

		/**
		 * Test just enough to rule out primitives, in order to take faster
		 * paths in some code
		 * @param {*} x
		 * @returns {boolean} false iff x is guaranteed *not* to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		function runContinuation1(f, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject(f, h.value, receiver, next);
			Promise.exitContext();
		}

		function runContinuation3(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.become(h);
			}

			Promise.enterContext(h);
			tryCatchReject3(f, x, h.value, receiver, next);
			Promise.exitContext();
		}

		/**
		 * @deprecated
		 */
		function runNotify(f, x, h, receiver, next) {
			if(typeof f !== 'function') {
				return next.notify(x);
			}

			Promise.enterContext(h);
			tryCatchReturn(f, x, receiver, next);
			Promise.exitContext();
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 */
		function tryCatchReject(f, x, thisArg, next) {
			try {
				next.become(getHandler(f.call(thisArg, x)));
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 */
		function tryCatchReject3(f, x, y, thisArg, next) {
			try {
				f.call(thisArg, x, y, next);
			} catch(e) {
				next.become(new Rejected(e));
			}
		}

		/**
		 * @deprecated
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 */
		function tryCatchReturn(f, x, thisArg, next) {
			try {
				next.notify(f.call(thisArg, x));
			} catch(e) {
				next.notify(e);
			}
		}

		function inherit(Parent, Child) {
			Child.prototype = objectCreate(Parent.prototype);
			Child.prototype.constructor = Child;
		}

		function noop() {}

		return Promise;
	};
});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(); }));

},{}],8:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {
	/*global setTimeout,clearTimeout*/
	var cjsRequire, vertx, setTimer, clearTimer;

	// Check for vertx environment by attempting to load vertx module.
	// Doing the check in two steps ensures compatibility with RaveJS,
	// which will return an empty module when browser: { vertx: false }
	// is set in package.json
	cjsRequire = require;

	try {
		vertx = cjsRequire('vertx');
	} catch (ignored) {}

	// If vertx loaded and has the timer features we expect, try to support it
	if (vertx && typeof vertx.setTimer === 'function') {
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
	} else {
		// NOTE: Truncate decimals to workaround node 0.10.30 bug:
		// https://github.com/joyent/node/issues/8167
		setTimer = function(f, ms) { return setTimeout(f, ms|0); };
		clearTimer = function(t) { return clearTimeout(t); };
	}

	return {
		set: setTimer,
		clear: clearTimer
	};

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{}]},{},[1])
(1)
});
;

/*
 * ES6 Module Loader Polyfill
 * https://github.com/ModuleLoader/es6-module-loader
 *
 * Based on the 2013-12-02 specification draft
 * System loader based on example implementation as of 2013-12-03
 *
 * Copyright (c) 2013 Guy Bedford, Luke Hoban, Addy Osmani
 * Licensed under the MIT license.
 *
 */

/*
  ToDo
  - Traceur ModuleTransformer update for new system
  - getImports to use visitor pattern
  - Loader Iterator support
  - Tracking these and spec issues with 'NB' comments in this code
*/
(function () {
  (function() {

    var isBrowser = typeof window != 'undefined';
    var global = isBrowser ? window : this;
    var exports = isBrowser ? window : module.exports;

    var nextTick = isBrowser ? function(fn) { setTimeout(fn, 1); } : process.nextTick;

    /*
    *********************************************************************************************

      Simple Promises A+ Implementation
      Adapted from https://github.com/RubenVerborgh/promiscuous
      Copyright 2013 Ruben Verborgh

    *********************************************************************************************
    */

    var Promise = global.Promise;
    if (Promise) {
      // check if native promises have what we need
      if (Promise.all && Promise.resolve && Promise.reject) {
        Promise = global.Promise;
        var p = new Promise(function(r) {
          if (typeof r != 'function')
            Promise = null;
        });
      }
      else
        Promise = null;
    }
    // export the promises polyfill
    if (!Promise)
    global.Promise = Promise = (function(setImmediate, func, obj) {
      // Type checking utility function
      function is(type, item) { return (typeof item)[0] == type; }

      // Creates a promise, calling callback(resolve, reject), ignoring other parameters.
      function Promise(callback, handler) {
        // The `handler` variable points to the function that will
        // 1) handle a .then(resolved, rejected) call
        // 2) handle a resolve or reject call (if the first argument === `is`)
        // Before 2), `handler` holds a queue of callbacks.
        // After 2), `handler` is a finalized .then handler.
        handler = function pendingHandler(resolved, rejected, value, queue, then, i) {
          queue = pendingHandler.q;

          // Case 1) handle a .then(resolved, rejected) call
          if (resolved != is) {
            return Promise(function(resolve, reject) {
              queue.push({ p: this, r: resolve, j: reject, 1: resolved, 0: rejected });
            });
          }

          // Case 2) handle a resolve or reject call
          // (`resolved` === `is` acts as a sentinel)
          // The actual function signature is
          // .re[ject|solve](<is>, success, value)

          // Check if the value is a promise and try to obtain its `then` method
          if (value && (is(func, value) | is(obj, value))) {
            try { then = value.then; }
            catch (reason) { rejected = 0; value = reason; }
          }
          // If the value is a promise, take over its state
          if (is(func, then)) {
            function valueHandler(resolved) {
              return function(value) { then && (then = 0, pendingHandler(is, resolved, value)); };
            }
            try { then.call(value, valueHandler(1), rejected = valueHandler(0)); }
            catch (reason) { rejected(reason); }
          }
          // The value is not a promise; handle resolve/reject
          else {
            // Replace this handler with a finalized resolved/rejected handler
            handler = createFinalizedThen(callback, value, rejected);
            // Resolve/reject pending callbacks
            i = 0;
            while (i < queue.length) {
              then = queue[i++];
              // If no callback, just resolve/reject the promise
              if (!is(func, resolved = then[rejected]))
                (rejected ? then.r : then.j)(value);
              // Otherwise, resolve/reject the promise with the result of the callback
              else
                finalize(then.p, then.r, then.j, value, resolved);
            }
          }
        };
        // The queue of pending callbacks; garbage-collected when handler is resolved/rejected
        handler.q = [];

        // Create and return the promise (reusing the callback variable)
        callback.call(callback = { then: function (resolved, rejected) { return handler(resolved, rejected); }, 
                                    catch: function (rejected)           { return handler(0,        rejected); } },
                      function(value)  { handler(is, 1,  value); },
                      function(reason) { handler(is, 0, reason); });
        return callback;
      }

      // Creates a resolved or rejected .then function
      function createFinalizedThen(promise, value, success) {
        return function(resolved, rejected) {
          // If the resolved or rejected parameter is not a function, return the original promise
          if (!is(func, (resolved = success ? resolved : rejected)))
            return promise;
          // Otherwise, return a finalized promise, transforming the value with the function
          return Promise(function(resolve, reject) { finalize(this, resolve, reject, value, resolved); });
        };
      }

      // Finalizes the promise by resolving/rejecting it with the transformed value
      function finalize(promise, resolve, reject, value, transform) {
        setImmediate(function() {
          try {
            // Transform the value through and check whether it's a promise
            value = transform(value);
            transform = value && (is(obj, value) | is(func, value)) && value.then;
            // Return the result if it's not a promise
            if (!is(func, transform))
              resolve(value);
            // If it's a promise, make sure it's not circular
            else if (value == promise)
              reject(new TypeError());
            // Take over the promise's state
            else
              transform.call(value, resolve, reject);
          }
          catch (error) { reject(error); }
        });
      }

      // Export the main module
      Promise.resolve = function (value) { return Promise(function (resolve)         { resolve(value) }); };
      Promise.reject = function (reason) { return Promise(function (resolve, reject) { reject(reason) }); };
      Promise.all = function(promises) {
        return new Promise(function(resolve, reject) {
          if (!promises.length)
            return setImmediate(resolve);

          var outputs = [];
          var resolved = 0;
          for (var i = 0, l = promises.length; i < l; i++) (function(i) {
            promises[i].then(function(resolvedVal) {
              outputs[i] = resolvedVal;
              resolved++;
              if (resolved == promises.length)
                resolve(outputs);
            }, reject);
          })(i);
        });
      }
      return Promise;
    })(nextTick, 'f', 'o');


    /*
    *********************************************************************************************
      
      Loader Polyfill

        - Implemented exactly to the 2013-12-02 Specification Draft -
          https://github.com/jorendorff/js-loaders/blob/e60d3651/specs/es6-modules-2013-12-02.pdf
          with the only exceptions as described here

        - Abstract functions have been combined where possible, and their associated functions 
          commented

        - Declarative Module Support is entirely disabled, and an error will be thrown if 
          the instantiate loader hook returns undefined

        - With this assumption, instead of Link, LinkDynamicModules is run directly

        - ES6 support is thus provided through the translate function of the System loader

        - EnsureEvaluated is removed, but may in future implement dynamic execution pending 
          issue - https://github.com/jorendorff/js-loaders/issues/63

        - Realm implementation is entirely omitted. As such, Loader.global and Loader.realm
          accessors will throw errors, as well as Loader.eval

        - Loader module table iteration currently not yet implemented

    *********************************************************************************************
    */

    // Some Helpers

    // logs a linkset snapshot for debugging
    /* function snapshot(loader) {
      console.log('\n');
      for (var i = 0; i < loader._loads.length; i++) {
        var load = loader._loads[i];
        var linkSetLog = load.name + ' (' + load.status + '): ';

        for (var j = 0; j < load.linkSets.length; j++) {
          linkSetLog += '{'
          linkSetLog += logloads(load.linkSets[j].loads);
          linkSetLog += '} ';
        }
        console.log(linkSetLog);
      }
      console.log('\n');
    }
    function logloads(loads) {
      var log = '';
      for (var k = 0; k < loads.length; k++)
        log += loads[k].name + (k != loads.length - 1 ? ' ' : '');
      return log;
    } */

    function assert(name, expression) {
      if (!expression)
        console.log('Assertion Failed - ' + name);
    }
    function defineProperty(obj, prop, opt) {
      if (Object.defineProperty)
        Object.defineProperty(obj, prop, opt);
      else
         obj[prop] = opt.value || opt.get.call(obj);
    };
    function preventExtensions(obj) {
      if (Object.preventExtensions)
        Object.preventExtensions(obj);
    }

    // Define an IE-friendly shim good-enough for purposes
    var indexOf = Array.prototype.indexOf || function (item) { 
      for (var i = 0, thisLen = this.length; i < thisLen; i++) {
        if (this[i] === item) {
          return i;
        }
      }
      return -1;
    };

    // Load Abstract Functions

    function createLoad(name) {
      return {
        status: 'loading',
        name: name,
        metadata: {},
        linkSets: []
      };
    }

    // promise for a load record, can be in registry, already loading, or not
    function requestLoad(loader, request, refererName, refererAddress) {
      return new Promise(function(resolve, reject) {
        // CallNormalize
        resolve(loader.normalize(request, refererName, refererAddress));
      })

      // GetOrCreateLoad
      .then(function(name) {
        var load;
        if (loader._modules[name]) {
          load = createLoad(name);
          load.status = 'linked';
          return load;
        }

        for (var i = 0, l = loader._loads.length; i < l; i++) {
          load = loader._loads[i];
          if (load.name == name) {
            assert('loading or loaded', load.status == 'loading' || load.status == 'loaded');
            return load;
          }
        }

        // CreateLoad
        load = createLoad(name);
        loader._loads.push(load);

        proceedToLocate(loader, load);

        return load;
      });
    }
    function proceedToLocate(loader, load) {
      proceedToFetch(loader, load,
        Promise.resolve()
        // CallLocate
        .then(function() {
          return loader.locate({ name: load.name, metadata: load.metadata });
        })
      );
    }
    function proceedToFetch(loader, load, p) {
      proceedToTranslate(loader, load, 
        p
        // CallFetch
        .then(function(address) {
          if (load.status == 'failed') // NB https://github.com/jorendorff/js-loaders/issues/88
            return undefined;
          load.address = address;
          return loader.fetch({ name: load.name, metadata: load.metadata, address: address });
        })        
      );
    }
    function proceedToTranslate(loader, load, p) {
      p
      // CallTranslate
      .then(function(source) {
        if (load.status == 'failed')
          return undefined;
        return loader.translate({ name: load.name, metadata: load.metadata, address: load.address, source: source })
      })

      // CallInstantiate
      .then(function(source) {
        if (load.status == 'failed')
          return undefined;
        load.source = source;
        return loader.instantiate({ name: load.name, metadata: load.metadata, address: load.address, source: source });
      })

      // InstantiateSucceeded
      .then(function(instantiateResult) {
        if (load.status == 'failed')
          return undefined;

        var depsList;
        if (instantiateResult === undefined)
          throw 'Declarative parsing is not implemented by the polyfill.';

        else if (typeof instantiateResult == 'object') {
          depsList = instantiateResult.deps || [];
          load.execute = instantiateResult.execute;
          load.kind = 'dynamic';
        }
        else
          throw TypeError('Invalid instantiate return value');

        // ProcessLoadDependencies
        load.dependencies = {};
        var loadPromises = [];
        for (var i = 0, l = depsList.length; i < l; i++) (function(request) {
          var p = requestLoad(loader, request, load.name, load.address);

          // AddDependencyLoad (load is parentLoad)
          p.then(function(depLoad) {
            assert('not already a dependency', !load.dependencies[request]);
            load.dependencies[request] = depLoad.name;

            if (depLoad.status != 'linked') {
              var linkSets = load.linkSets.concat([]);
              for (var i = 0, l = linkSets.length; i < l; i++)
                addLoadToLinkSet(linkSets[i], depLoad);
            }
          });

          loadPromises.push(p);
        })(depsList[i]);

        return Promise.all(loadPromises);
      })

      // LoadSucceeded
      .then(function() {
        assert('is loading', load.status == 'loading');

        load.status = 'loaded';

        // console.log('load succeeeded ' + load.name);
        // snapshot(loader);

        var linkSets = load.linkSets.concat([]);
        for (var i = 0, l = linkSets.length; i < l; i++)
          updateLinkSetOnLoad(linkSets[i], load);
      }
      
      // LoadFailed
      , function(exc) {
        assert('is loading on fail', load.status == 'loading');
        load.status = 'failed';
        load.exception = exc;
        for (var i = 0, l = load.linkSets.length; i < l; i++)
          linkSetFailed(load.linkSets[i], exc);
        assert('fail linkSets removed', load.linkSets.length == 0);
      });
    }


    // LinkSet Abstract Functions
    function createLinkSet(loader, startingLoad) {
      var resolve, reject, promise = new Promise(function(_resolve, _reject) { resolve = _resolve; reject = _reject; });
      var linkSet = {
        loader: loader,
        loads: [],
        done: promise,
        resolve: resolve,
        reject: reject,
        loadingCount: 0
      };
      addLoadToLinkSet(linkSet, startingLoad);
      return linkSet;
    }
    function addLoadToLinkSet(linkSet, load) {
      assert('loading or loaded on link set', load.status == 'loading' || load.status == 'loaded');

      for (var i = 0, l = linkSet.loads.length; i < l; i++)
        if (linkSet.loads[i] == load)
          return;

      linkSet.loads.push(load);
      load.linkSets.push(linkSet);

      if (load.status != 'loaded')
        linkSet.loadingCount++;

      var loader = linkSet.loader;

      for (var dep in load.dependencies) {
        var name = load.dependencies[dep];

        if (loader._modules[name])
          continue;

        for (var i = 0, l = loader._loads.length; i < l; i++)
          if (loader._loads[i].name == name) {
            addLoadToLinkSet(linkSet, loader._loads[i]);
            break;
          }
      }
      // console.log('add to linkset ' + load.name);
      // snapshot(linkSet.loader);
    }
    function updateLinkSetOnLoad(linkSet, load) {
      // NB https://github.com/jorendorff/js-loaders/issues/85
      // assert('no load when updated ' + load.name, indexOf.call(linkSet.loads, load) != -1);
      assert('loaded or linked', load.status == 'loaded' || load.status == 'linked');

      // console.log('update linkset on load ' + load.name);
      // snapshot(linkSet.loader);

      // see https://github.com/jorendorff/js-loaders/issues/80
      linkSet.loadingCount--;
      /* for (var i = 0; i < linkSet.loads.length; i++) {
        if (linkSet.loads[i].status == 'loading') {
          return;
        }
      } */
      
      if (linkSet.loadingCount > 0)
        return;

      var startingLoad = linkSet.loads[0];
      try {
        link(linkSet.loads, linkSet.loader);
      }
      catch(exc) {
        return linkSetFailed(linkSet, exc);
      }

      assert('loads cleared', linkSet.loads.length == 0);
      linkSet.resolve(startingLoad);
    }
    function linkSetFailed(linkSet, exc) {
      var loads = linkSet.loads.concat([]);
      for (var i = 0, l = loads.length; i < l; i++) {
        var load = loads[i];
        var linkIndex = indexOf.call(load.linkSets, linkSet);
        assert('link not present', linkIndex != -1);
        load.linkSets.splice(linkIndex, 1);
        if (load.linkSets.length == 0) {
          var globalLoadsIndex = indexOf.call(linkSet.loader._loads, load);
          if (globalLoadsIndex != -1)
            linkSet.loader._loads.splice(globalLoadsIndex, 1);
        }
      }
      linkSet.reject(exc);
    }
    function finishLoad(loader, load) {
      // if not anonymous, add to the module table
      if (load.name) {
        assert('load not in module table', !loader._modules[load.name]);
        loader._modules[load.name] = load.module;
      }
      var loadIndex = indexOf.call(loader._loads, load);
      if (loadIndex != -1)
        loader._loads.splice(loadIndex, 1);
      for (var i = 0, l = load.linkSets.length; i < l; i++) {
        loadIndex = indexOf.call(load.linkSets[i].loads, load);
        load.linkSets[i].loads.splice(loadIndex, 1);
      }
      load.linkSets = [];
    }
    function loadModule(loader, name, options) {
      return new Promise(asyncStartLoadPartwayThrough(loader, name, options && options.address ? 'fetch' : 'locate', undefined, options && options.address, undefined)).then(function(load) {
        return load;
      });
    }
    function asyncStartLoadPartwayThrough(loader, name, step, meta, address, source) {
      return function(resolve, reject) {
        if (loader._modules[name])
          throw new TypeError('Module "' + name + '" already exists in the module table');
        for (var i = 0, l = loader._loads.length; i < l; i++)
          if (loader._loads[i].name == name)
            throw new TypeError('Module "' + name + '" is already loading');

        var load = createLoad(name);

        if (meta)
          load.metadata = meta;

        var linkSet = createLinkSet(loader, load);

        loader._loads.push(load);

        // NB spec change as in https://github.com/jorendorff/js-loaders/issues/79
        linkSet.done.then(resolve, reject);

        if (step == 'locate')
          proceedToLocate(loader, load);

        else if (step == 'fetch')
          proceedToFetch(loader, load, Promise.resolve(address));

        else {
          assert('translate step', step == 'translate');
          load.address = address;
          proceedToTranslate(loader, load, Promise.resolve(source));
        }
      }
    }
    function evaluateLoadedModule(loader, load) {
      assert('is linked ' + load.name, load.status == 'linked');

      assert('is a module', load.module instanceof Module);

      // ensureEvaluated(load.module, [], loader);

      return load.module;
    }

    // Module Object
    function Module(obj) {
      if (typeof obj != 'object')
        throw new TypeError('Expected object');

      if (!(this instanceof Module))
        return new Module(obj);

      var self = this;
      for (var key in obj) {
        (function (key, value) {
          defineProperty(self, key, {
            configurable: false,
            enumerable: true,
            get: function () {
              return value;
            }
          });
        })(key, obj[key]);
      }
      preventExtensions(this);
    }
    // Module.prototype = null;


    // Linking
    // Link is directly LinkDynamicModules assuming all modules are dynamic
    function link(loads, loader) {
      // console.log('linking {' + logloads(loads) + '}');

      // continue until all linked
      // NB circular dependencies will stall this loop
      var loopCnt = 0;
      while (loads.length) {
        loopCnt++;
        // search through to find a load with all its dependencies linked
        search: for (var i = 0; i < loads.length; i++) {
          var load = loads[i];
          var depNames = [];
          for (var d in load.dependencies) {
            var depName = load.dependencies[d];
            // being in the module table means it is linked
            if (!loader._modules[depName])
              continue search;
            depNames.push(depName);
          }

          // all dependencies linked now, so we can execute
          var module = load.execute.apply(null, depNames);
          if (!(module instanceof Module))
            throw new TypeError('Execution must define a Module instance');
          load.module = module;
          load.status = 'linked';
          finishLoad(loader, load);
        }
        if (loopCnt === 1000) {
          console.log('Circular Dependency Detected');
          return;
        }
      }
      // console.log('linked');
    }

    // Loader
    function Loader(options) {
      if (typeof options != 'object')
        throw new TypeError('Options must be an object');

      if (options.normalize)
        this.normalize = options.normalize;
      if (options.locate)
        this.locate = options.locate;
      if (options.fetch)
        this.fetch = options.fetch;
      if (options.translate)
        this.translate = options.translate;
      if (options.instantiate)
        this.instantiate = options.instantiate;

      defineProperty(this, 'global', {
        get: function() {
          throw new TypeError('global accessor not provided by polyfill');
        }
      });
      defineProperty(this, 'realm', {
        get: function() {
          throw new TypeError('Realms not implemented in polyfill');
        }
      });
      
      this._modules = {};
      this._loads = [];
    }

    // NB importPromises hacks ability to import a module twice without error - https://github.com/jorendorff/js-loaders/issues/60
    var importPromises = {};
    Loader.prototype = {
      define: function(name, source, options) {
        if (importPromises[name])
          throw new TypeError('Module is already loading.');
        importPromises[name] = new Promise(asyncStartLoadPartwayThrough(this, name, options && options.address ? 'fetch' : 'translate', options && options.meta || {}, options && options.address, source));
        return importPromises[name].then(function() { delete importPromises[name]; });
      },
      load: function(request, options) {
        if (this._modules[request])
          return Promise.resolve(this._modules[request]);
        if (importPromises[request])
          return importPromises[request];
        importPromises[request] = loadModule(this, request, options);
        return importPromises[request].then(function() { delete importPromises[request]; })
      },
      module: function(source, options) {
        var load = createLoad();
        load.address = options && options.address;
        var linkSet = createLinkSet(this, load);
        var sourcePromise = Promise.resolve(source);
        var p = linkSet.done.then(function() {
          evaluateLoadedModule(this, load);
        });
        proceedToTranslate(this, load, sourcePromise);
        return p;
      },
      import: function(name, options) {
        if (this._modules[name])
          return Promise.resolve(this._modules[name]);
        return (importPromises[name] || (importPromises[name] = loadModule(this, name, options)))
          .then(function(load) {
            delete importPromises[name];
            return evaluateLoadedModule(this, load);
          });
      },
      eval: function(source) {
        throw new TypeError('Eval not implemented in polyfill')
      },
      get: function(key) {
        // NB run ensure evaluted here when implemented
        return this._modules[key];
      },
      has: function(name) {
        return !!this._modules[name];
      },
      set: function(name, module) {
        if (!(module instanceof Module))
          throw new TypeError('Set must be a module');
        this._modules[name] = module;
      },
      delete: function(name) {
        return this._modules[name] ? delete this._modules[name] : false;
      },
      // NB implement iterations
      entries: function() {
        throw new TypeError('Iteration not yet implemented in the polyfill');
      },
      keys: function() {
        throw new TypeError('Iteration not yet implemented in the polyfill');
      },
      values: function() {
        throw new TypeError('Iteration not yet implemented in the polyfill');
      },
      normalize: function(name, refererName, refererAddress) {
        return name;
      },
      locate: function(load) {
        return load.name;
      },
      fetch: function(load) {
        throw new TypeError('Fetch not implemented');
      },
      translate: function(load) {
        return load.source;
      },
      instantiate: function(load) {
      }
    };



    /*
    *********************************************************************************************
      
      System Loader Implementation

        - Implemented to https://github.com/jorendorff/js-loaders/blob/master/browser-loader.js,
          except for Instantiate function

        - Instantiate function determines if ES6 module syntax is being used, if so parses with 
          Traceur and returns a dynamic InstantiateResult for loading ES6 module syntax in ES5.
        
        - Custom loaders thus can be implemented by using this System.instantiate function as 
          the fallback loading scenario, after other module format detections.

        - Traceur is loaded dynamically when module syntax is detected by a regex (with over-
          classification), either from require('traceur') on the server, or the 
          'data-traceur-src' property on the current script in the browser, or if not set, 
          'traceur.js' in the same URL path as the current script in the browser.

        - <script type="module"> supported, but <module> tag not

    *********************************************************************************************
    */

    // Helpers
    // Absolute URL parsing, from https://gist.github.com/Yaffle/1088850
    function parseURI(url) {
      var m = String(url).replace(/^\s+|\s+$/g, '').match(/^([^:\/?#]+:)?(\/\/(?:[^:@]*(?::[^:@]*)?@)?(([^:\/?#]*)(?::(\d*))?))?([^?#]*)(\?[^#]*)?(#[\s\S]*)?/);
      // authority = '//' + user + ':' + pass '@' + hostname + ':' port
      return (m ? {
        href     : m[0] || '',
        protocol : m[1] || '',
        authority: m[2] || '',
        host     : m[3] || '',
        hostname : m[4] || '',
        port     : m[5] || '',
        pathname : m[6] || '',
        search   : m[7] || '',
        hash     : m[8] || ''
      } : null);
    }
    function toAbsoluteURL(base, href) {
      function removeDotSegments(input) {
        var output = [];
        input.replace(/^(\.\.?(\/|$))+/, '')
          .replace(/\/(\.(\/|$))+/g, '/')
          .replace(/\/\.\.$/, '/../')
          .replace(/\/?[^\/]*/g, function (p) {
            if (p === '/..')
              output.pop();
            else
              output.push(p);
        });
        return output.join('').replace(/^\//, input.charAt(0) === '/' ? '/' : '');
      }
     
      href = parseURI(href || '');
      base = parseURI(base || '');
     
      return !href || !base ? null : (href.protocol || base.protocol) +
        (href.protocol || href.authority ? href.authority : base.authority) +
        removeDotSegments(href.protocol || href.authority || href.pathname.charAt(0) === '/' ? href.pathname : (href.pathname ? ((base.authority && !base.pathname ? '/' : '') + base.pathname.slice(0, base.pathname.lastIndexOf('/') + 1) + href.pathname) : base.pathname)) +
        (href.protocol || href.authority || href.pathname ? href.search : (href.search || base.search)) +
        href.hash;
    }

    var fetchTextFromURL;
    if (isBrowser) {
      fetchTextFromURL = function(url, fulfill, reject) {
        var xhr = new XMLHttpRequest();
        if (!('withCredentials' in xhr)) {
          // check if same domain
          var sameDomain = true,
          domainCheck = /^(\w+:)?\/\/([^\/]+)/.exec(url);
          if (domainCheck) {
            sameDomain = domainCheck[2] === window.location.host;
            if (domainCheck[1])
              sameDomain &= domainCheck[1] === window.location.protocol;
          }
          if (!sameDomain)
            xhr = new XDomainRequest();
        }

        xhr.onreadystatechange = function () {
          if (xhr.readyState === 4) {
            if (xhr.status === 200 || (xhr.status == 0 && xhr.responseText)) {
              fulfill(xhr.responseText);
            } else {
              reject(xhr.statusText + ': ' + url || 'XHR error');
            }
          }
        };
        xhr.open("GET", url, true);
        xhr.send(null);
      }
    }
    else {
      var fs = require('fs');
      fetchTextFromURL = function(url, fulfill, reject) {
        return fs.readFile(url, function(err, data) {
          if (err)
            return reject(err);
          else
            fulfill(data + '');
        });
      }
    }

    var System = new Loader({
      global: isBrowser ? window : global,
      strict: true,
      normalize: function(name, parentName, parentAddress) {
        if (typeof name != 'string')
          throw new TypeError('Module name must be a string');

        var segments = name.split('/');

        if (segments.length == 0)
          throw new TypeError('No module name provided');

        // current segment
        var i = 0;
        // is the module name relative
        var rel = false;
        // number of backtracking segments
        var dotdots = 0;
        if (segments[0] == '.') {
          i++;
          if (i == segments.length)
            throw new TypeError('Illegal module name "' + name + '"');
          rel = true;
        }
        else {
          while (segments[i] == '..') {
            i++;
            if (i == segments.length)
              throw new TypeError('Illegal module name "' + name + '"');
          }
          if (i)
            rel = true;
          dotdots = i;
        }

        for (var j = i; j < segments.length; j++) {
          var segment = segments[j];
          if (segment == '' || segment == '.' || segment == '..')
            throw new TypeError('Illegal module name"' + name + '"');
        }

        if (!rel)
          return name;

        // build the full module name
        var normalizedParts = [];
        var parentParts = (parentName || '').split('/');
        var normalizedLen = parentParts.length - 1 - dotdots;

        normalizedParts = normalizedParts.concat(parentParts.splice(0, parentParts.length - 1 - dotdots));
        normalizedParts = normalizedParts.concat(segments.splice(i));

        return normalizedParts.join('/');
      },
      locate: function(load) {
        var name = load.name;

        // NB no specification provided for System.paths, used ideas discussed in https://github.com/jorendorff/js-loaders/issues/25

        // most specific (longest) match wins
        var pathMatch = '', wildcard;

        // check to see if we have a paths entry
        for (var p in this.paths) {
          var pathParts = p.split('*');
          if (pathParts.length > 2)
            throw new TypeError('Only one wildcard in a path is permitted');

          // exact path match
          if (pathParts.length == 1) {
            if (name == p && p.length > pathMatch.length)
              pathMatch = p;
          }

          // wildcard path match
          else {
            if (name.substr(0, pathParts[0].length) == pathParts[0] && name.substr(name.length - pathParts[1].length) == pathParts[1]) {
              pathMatch = p;
              wildcard = name.substr(pathParts[0].length, name.length - pathParts[1].length - pathParts[0].length);
            }
          }
        }

        var outPath = this.paths[pathMatch];
        if (wildcard)
          outPath = outPath.replace('*', wildcard);

        return toAbsoluteURL(this.baseURL, outPath);
      },
      fetch: function(load) {
        var resolve, reject, promise = new Promise(function(_resolve, _reject) { resolve = _resolve; reject = _reject; });
        fetchTextFromURL(toAbsoluteURL(this.baseURL, load.address), function(source) {
          resolve(source);
        }, reject);
        return promise;
      },
      instantiate: function(load) {

        // allow empty source
        if (!load.source) {
          return {
            deps: [],
            execute: function() {
              return new global.Module({});
            }
          };
        }

        // normal eval (non-module code)
        // note that anonymous modules (load.name == undefined) are always 
        // anonymous <module> tags, so we use Traceur for these
        if (!load.metadata.es6 && load.name && (load.metadata.es6 === false || !load.source.match(es6RegEx))) {
          return {
            deps: [],
            execute: function() {
              __eval(load.source, global, load.address, load.name);

              // when loading traceur, it overwrites the System
              // global. The only way to synchronously ensure it is
              // reverted in time not to cause issue is here
              if (load.name == 'traceur' && isBrowser) {
                global.traceur = global.System.get('../src/traceur.js');
                global.System = System;
              }

              // return an empty module
              return new Module({});
            }
          };
        }

        var match;
        var loader = this;
        // alias check is based on a "simple form" only
        // eg import * from 'jquery';
        if (match = load.source.match(aliasRegEx)) {
          return {
            deps: [match[1] || match[2]],
            execute: function(dep) {
              return loader._modules[dep];
            }
          };
        }

        // ES6 -> ES5 conversion
        load.address = load.address || 'anonymous-module-' + anonCnt++;
        // load traceur and the module transformer
        return getTraceur()
        .then(function(traceur) {

          traceur.options.sourceMaps = true;
          traceur.options.modules = 'parse';
          // traceur.options.blockBinding = true;

          var reporter = new traceur.util.ErrorReporter();

          reporter.reportMessageInternal = function(location, kind, format, args) {
            throw kind + '\n' + location;
          }

          var parser = new traceur.syntax.Parser(reporter, new traceur.syntax.SourceFile(load.address, load.source));

          var tree = parser.parseModule();


          var imports = getImports(tree);

          return {
            deps: imports,
            execute: function() {

              // write dependencies as unique globals
              // creating a map from the unnormalized import name to the unique global name
              var globalMap = {};
              for (var i = 0; i < arguments.length; i++) {
                var name = '__moduleDependency' + i;
                global[name] = System.get(arguments[i]);
                globalMap[imports[i]] = name;
              }

              // transform
              var transformer = new traceur.codegeneration.FromOptionsTransformer(reporter);
              transformer.append(function(tree) {
                return new traceur.codegeneration.ModuleLoaderTransformer(globalMap, '__exports').transformAny(tree);
              });
              tree = transformer.transform(tree);

              // convert back to a source string
              var sourceMapGenerator = new traceur.outputgeneration.SourceMapGenerator({ file: load.address });
              var options = { sourceMapGenerator: sourceMapGenerator };

              source = traceur.outputgeneration.TreeWriter.write(tree, options);
              if (isBrowser && window.btoa)
                source += '\n//# sourceMappingURL=data:application/json;base64,' + btoa(unescape(encodeURIComponent(options.sourceMap))) + '\n';

              global.__exports = {};

              __eval(source, global, load.address, load.name);

              var exports = global.__exports;

              delete global.__exports;
              for (var i = 0; i < arguments.length; i++)
                delete global['__moduleDependency' + i];

              return new Module(exports);
            }
          };
        });
      }
    });

    // count anonymous evals to have unique name
    var anonCnt = 1;

    if (isBrowser) {
      var href = window.location.href.split('#')[0].split('?')[0];
      System.baseURL = href.substring(0, href.lastIndexOf('\/') + 1);
    }
    else {
      System.baseURL = './';
    }
    System.paths = { '*': '*.js' };


    // ES6 to ES5 parsing functions

    // comprehensively overclassifying regex detectection for es6 module syntax
    var es6RegEx = /(?:^\s*|[}{\(\);,\n]\s*)(import\s+['"]|(import|module)\s+[^"'\(\)\n;]+\s+from\s+['"]|export\s+(\*|\{|default|function|var|const|let|[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*))/;

    // es6 module forwarding - allow detecting without Traceur
    var aliasRegEx = /^\s*export\s*\*\s*from\s*(?:'([^']+)'|"([^"]+)")/;
    
    // dynamically load traceur when needed
    // populates the traceur, reporter and moduleLoaderTransfomer variables

    // NB we need to queue getTraceur callbacks due to https://github.com/jorendorff/js-loaders/issues/60
    var traceur, traceurPromise;
    function getTraceur() {
      if (traceur)
        return Promise.resolve(traceur || (traceur = global.traceur));

      if (traceurPromise)
        return traceurPromise;

      return traceurPromise = (isBrowser ? exports.System.import : function(name, src, callback) {
        return Promise.resolve(require('traceur'));
      }).call(exports.System, 'traceur', { address: traceurSrc }).then(function(_traceur) {
        traceurPromise = null;
        
        if (isBrowser)
          _traceur = global.traceur;

        traceur = _traceur;

        traceur.codegeneration.ModuleLoaderTransformer = createModuleLoaderTransformer(
          traceur.codegeneration.ParseTreeFactory,
          traceur.codegeneration.ParseTreeTransformer
        );

        return traceur;
      });
    }

    // NB update to new transformation system
    function createModuleLoaderTransformer(ParseTreeFactory, ParseTreeTransformer) {
      var createAssignmentExpression = ParseTreeFactory.createAssignmentExpression;
      var createVariableDeclaration = ParseTreeFactory.createVariableDeclaration;
      
      var createCallExpression = ParseTreeFactory.createCallExpression;

      var createVariableDeclarationList = ParseTreeFactory.createVariableDeclarationList;
      var createStringLiteral = ParseTreeFactory.createStringLiteral;
      var createIdentifierExpression = ParseTreeFactory.createIdentifierExpression;

      var createMemberLookupExpression = ParseTreeFactory.createMemberLookupExpression;

      var createCommaExpression = ParseTreeFactory.createCommaExpression;
      var createVariableStatement = ParseTreeFactory.createVariableStatement;

      var createAssignmentStatement = ParseTreeFactory.createAssignmentStatement;
      var createExpressionStatement = ParseTreeFactory.createExpressionStatement;


      var self = this;
      var ModuleLoaderTransformer = function(globalMap, exportGlobal) {
        this.depMap = globalMap;
        this.exportGlobal = exportGlobal;
      }
      ModuleLoaderTransformer.prototype = Object.create(ParseTreeTransformer.prototype);

      // var VARIABLE = __moduleDependencyX['VALUE'], ...
      // var VARIABLE = __moduleDependencyX, ...
      ModuleLoaderTransformer.prototype.createModuleVariableDeclaration = function(moduleName, variables, values, location) {
        var self = this;
        var variableDeclarations = variables.map(function(variable, i) {
          return createVariableDeclaration(variable, self.createImportExpression(moduleName, values[i]));
        });
        var varList = createVariableDeclarationList('var', variableDeclarations);
        varList.location = location;
        return createVariableStatement(varList);
      }

      // __moduleDependencyX['VALUE']
      ModuleLoaderTransformer.prototype.createImportExpression = function(moduleName, value) {
        var expression = createIdentifierExpression(this.depMap[moduleName]);
        return value ? createMemberLookupExpression(expression, createStringLiteral(value)) : expression;
      }

      // __exports['EXPORT_NAME']
      ModuleLoaderTransformer.prototype.createExportExpression = function(exportName) {
        return createMemberLookupExpression(createIdentifierExpression(this.exportGlobal), createStringLiteral(exportName));
      }

      ModuleLoaderTransformer.prototype.transformImportDeclaration = function(tree) {
        var moduleName = tree.moduleSpecifier.token.processedValue;

        var variables = [];
        var values = [];

        // import 'jquery';
        if (!tree.importClause) {
          return;
        }
        // import $ from 'jquery';
        else if (tree.importClause && tree.importClause.binding) {
          variables.push(tree.importClause.binding.identifierToken);
          values.push('default');
        }
        // import { ... } from 'jquery';
        else if (tree.importClause) {
          var specifiers = tree.importClause.specifiers;
          for (var i = 0; i < specifiers.length; i++) {
            var specifier = specifiers[i];
            variables.push(specifier.rhs ? specifier.rhs.value : specifier.lhs.value);
            values.push(specifier.lhs.value);
          }
        }
        return this.createModuleVariableDeclaration(moduleName, variables, values, tree.location);
      }
      ModuleLoaderTransformer.prototype.transformModuleDeclaration = function(tree) {
        var moduleName = tree.expression.token.processedValue;
        return this.createModuleVariableDeclaration(moduleName, [tree.identifier], [null], tree.location);
      }
      ModuleLoaderTransformer.prototype.transformExportDeclaration = function(tree) {
        var declaration = tree.declaration;

        if (declaration.type == 'NAMED_EXPORT') {
          var moduleName = declaration.moduleSpecifier && declaration.moduleSpecifier.token.processedValue;
          // export {a as b, c as d}
          // export {a as b, c as d} from 'module'
          if (declaration.specifierSet.type != 'EXPORT_STAR') {
            var expressions = [];
            var specifiers = declaration.specifierSet.specifiers;
            for (var i = 0; i < specifiers.length; i++) {
              var specifier = specifiers[i];
              expressions.push(createAssignmentExpression(
                this.createExportExpression(specifier.rhs ? specifier.rhs.value : specifier.lhs.value),
                moduleName
                  ? this.createImportExpression(moduleName, specifier.lhs.value)
                  : createIdentifierExpression(specifier.lhs.value)
              ));
            }
            var commaExpression = createExpressionStatement(createCommaExpression(expressions));
            commaExpression.location = tree.location;
            return commaExpression;
          }
          else {
            var exportStarStatement = createAssignmentStatement(createIdentifierExpression(this.exportGlobal), this.createImportExpression(moduleName));
            exportStarStatement.location = tree.location;
            return exportStarStatement;
          }
        }
        
        // export var p = 4;
        else if (declaration.type == 'VARIABLE_STATEMENT') {
          // export var p = ...
          var varDeclaration = declaration.declarations.declarations[0];
          varDeclaration.initialiser = createAssignmentExpression(
            this.createExportExpression(varDeclaration.lvalue.identifierToken.value), 
            this.transformAny(varDeclaration.initialiser)
          );
          return declaration;
        }
        // export function q() {}
        else if (declaration.type == 'FUNCTION_DECLARATION') {
          var varDeclaration = createVariableDeclaration(
            declaration.name.identifierToken.value, 
            createAssignmentStatement(
              this.createExportExpression(declaration.name.identifierToken.value), 
              this.transformAny(declaration)
            )
          );
          varDeclaration.location = tree.location;
          return createVariableDeclarationList('var', [varDeclaration]);
        }
        // export default ...
        else if (declaration.type == 'EXPORT_DEFAULT') {
          return createAssignmentStatement(
            this.createExportExpression('default'), 
            this.transformAny(declaration.expression)
          );
        }
         
        return tree;
      }
      return ModuleLoaderTransformer;
    }

    // tree traversal, NB should use visitor pattern here
    function traverse(object, iterator, parent, parentProperty) {
      var key, child;
      if (iterator(object, parent, parentProperty) === false)
        return;
      for (key in object) {
        if (!object.hasOwnProperty(key))
          continue;
        if (key == 'location' || key == 'type')
          continue;
        child = object[key];
        if (typeof child == 'object' && child !== null)
          traverse(child, iterator, object, key);
      }
    }

    // given a syntax tree, return the import list
    function getImports(moduleTree) {
      var imports = [];

      function addImport(name) {
        if (indexOf.call(imports, name) == -1)
          imports.push(name);
      }

      traverse(moduleTree, function(node) {
        // import {} from 'foo';
        // export * from 'foo';
        // export { ... } from 'foo';
        // module x from 'foo';
        if (node.type == 'EXPORT_DECLARATION') {
          if (node.declaration.moduleSpecifier)
            addImport(node.declaration.moduleSpecifier.token.processedValue);
        }
        else if (node.type == 'IMPORT_DECLARATION')
          addImport(node.moduleSpecifier.token.processedValue);
        else if (node.type == 'MODULE_DECLARATION')
          addImport(node.expression.token.processedValue);
      });
      return imports;
    }


    // Export the Loader class
    exports.Loader = Loader;
    // Export the Module class
    exports.Module = Module;
    // Export the System object
    exports.System = System;

    var traceurSrc;

    // <script type="module"> support
    // allow a data-init function callback once loaded
    if (isBrowser) {
      var curScript = document.getElementsByTagName('script');
      curScript = curScript[curScript.length - 1];

      // set the path to traceur
      traceurSrc = curScript.getAttribute('data-traceur-src')
        || curScript.src.substr(0, curScript.src.lastIndexOf('/') + 1) + 'traceur.js';

      document.onreadystatechange = function() {
        if (document.readyState == 'interactive') {
          var scripts = document.getElementsByTagName('script');

          for (var i = 0; i < scripts.length; i++) {
            var script = scripts[i];
            if (script.type == 'module') {
              // <script type="module" name="" src=""> support
              var name = script.getAttribute('name');
              var address = script.getAttribute('src');
              var source = script.innerHTML;

              (name
                ? System.define(name, source, { address: address })
                : System.module(source, { address: address })
              ).then(function() {}, function(err) { nextTick(function() { throw err; }); });
            }
          }
        }
      }

      // run the data-init function on the script tag
      if (curScript.getAttribute('data-init'))
        window[curScript.getAttribute('data-init')]();
    }

  })();

  function __eval(__source, global, __sourceURL, __moduleName) {
    try {
      Function('global', 'var __moduleName = "' + (__moduleName || '').replace('"', '\"') + '"; with(global) { ' + __source + ' \n }'
        + (__sourceURL && !__source.match(/\/\/[@#] ?(sourceURL|sourceMappingURL)=([^\n]+)/)
        ? '\n//# sourceURL=' + __sourceURL : '')).call(global, global);
    }
    catch(e) {
      if (e.name == 'SyntaxError')
        e.message = 'Evaluating ' + __sourceURL + '\n\t' + e.message;
      throw e;
    }
  }

})();


/** RaveJS */
/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
(function (bundle) {
var exports = {}, context = {}, define;

var global, doc, location,
	raveMain, hooksName, amdBundleModuleName;

global = typeof self !== 'undefined' && self
	|| typeof global !== 'undefined' && global;

doc = global.document;
location = window.location;

raveMain = 'rave@0.4.3/start';
hooksName = 'rave@0.4.3/src/hooks';
amdBundleModuleName = 'rave@0.4.3/lib/amd/bundle';

// export public functions
exports.init = init;
exports.boot = boot;
exports.simpleDefine = simpleDefine;
exports.contextDefine = contextDefine;
exports.evalPredefines = evalPredefines;

// export testable functions
exports.getCurrentScript = getCurrentScript;
exports.getPathFromUrl = getPathFromUrl;
exports.mergeGlobalOptions = mergeGlobalOptions;
exports.fromLoader = fromLoader;
exports.toLoader = toLoader;
exports.autoModules = autoModules;
exports.ensureFactory = ensureFactory;

// initialize
function init (context) {
	var scriptUrl = getCurrentScript();
	var baseUrl = doc
		? getPathFromUrl(
			// Opera has no location.origin, so we have to build it
			location.protocol + '//' + location.host + location.pathname
		)
		: __dirname;

	context.raveScript = scriptUrl;
	context.baseUrl = baseUrl;
	context.loader = new Loader({});

	return mergeGlobalOptions(context);
}

function boot (context) {
	var loader = context.loader;
	try {
		var hooks = fromLoader(loader.get(hooksName));
		// extend loader enough to load rave
		hooks(context);
		// launch rave
		loader.import(raveMain).then(go, failLoudly);
	}
	catch (ex) {
		failLoudly(ex);
	}
	function go (main) {
		main = fromLoader(main);
		if (!main) failLoudly(new Error('No main module.'));
		else if (typeof main.main === 'function') main.main(context);
		else if (typeof main === 'function') main(context);
	}
	function failLoudly (ex) {
		console.error(ex);
		throw ex;
	}
}

function getCurrentScript () {
	var stack, matches;

	// HTML5 way
	if (doc && doc.currentScript) return doc.currentScript.src;

	// From https://gist.github.com/cphoover/6228063
	// (Note: Ben Alman's shortcut doesn't work everywhere.)
	// TODO: see if stack trace trick works in IE8+.
	// Otherwise, loop to find script.readyState == 'interactive' in IE.
	stack = '';
	try { throw new Error(); } catch (ex) { stack = ex.stack; }
	matches = stack.match(/(?:http:|https:|file:|\/).*?\.js/);

	return matches && matches[0];
}

function getPathFromUrl (url) {
	var last = url.lastIndexOf('/');
	return url.slice(0, last) + '/';
}

function mergeGlobalOptions (context) {
	if (!doc) return context;
	var el = doc.documentElement;
	var meta = el.getAttribute('data-rave-meta');
	if (meta) {
		context.raveMeta = meta;
	}
	return context;
}

function simpleDefine (context) {
	var loader, _global;
	loader = context.loader;
	// temporary work-around for es6-module-loader which throws when
	// accessing loader.global
	try { _global = loader.global } catch (ex) { _global = global; }
	global.global = global; // TODO: remove this when we are able to supply a 'global' to crammed node modules
	return function (id, deps, factory) {
		var scoped, modules, i, len, isCjs = false, value;
		scoped = {
			require: function (id) { return fromLoader(loader.get(id)); },
			exports: {},
			global: _global
		};
		scoped.module = { exports: scoped.exports };
		scoped.require.async = function (id) {
			// hack: code needs a refid even though we're using abs ids already
			var abs = loader.normalize(id, 'rave');
			return loader.import(abs).then(fromLoader);
		};
		modules = [];
		// if deps has been omitted
		if (arguments.length === 2) {
			factory = deps;
			deps = autoModules(factory);
		}
		for (i = 0, len = deps.length; i < len; i++) {
			modules[i] = deps[i] in scoped
				? scoped[deps[i]]
				: scoped.require(deps[i]);
			isCjs |= deps[i] === 'exports' || deps[i] === 'module';
		}
		// eager instantiation.
		value = factory.apply(null, modules);
		// find result, preferring a returned value
		if (typeof value !== 'undefined') {
			value = toLoader(value);
		}
		else if (isCjs) {
			value = scoped.exports;
			if (scoped.module.exports !== value) {
				value = toLoader(scoped.module.exports);
			}
		}
		else {
			value = {}; // es6 needs an object
		}
		loader.set(id, new Module(value));
	};
}

function contextDefine (context) {
	return function () {
		var bctx;
		bctx = arguments[arguments.length - 1];
		if (typeof bctx === 'function') bctx = bctx();
		context.app = bctx.app;
		context.env = bctx.env;
		context.metadata = bctx.metadata;
		context.packages = bctx.packages;
	};
}

function evalPredefines (bundle) {
	var defines = [];
	return function (context) {
		var loader, process, load;

		define.amd = { jQuery: true };
		bundle(define);
		if (!defines.length) return context;

		loader = context.loader;
		process = loader.get(amdBundleModuleName).process;
		load = {
			address: context.raveScript,
			metadata: { rave: context }
		};

		process(load, defines);

		return context;
	};
	function define (id, deps, factory) {
		if (arguments.length === 2) {
			factory = deps;
			deps = autoModules(factory);
		}
		defines.push({
			name: id,
			depsList: deps,
			factory: ensureFactory(factory)
		});
	}
}

function autoModules (factory) {
	return ['require', 'exports', 'module'].slice(0, factory.length);
}

function ensureFactory (factory) {
	return typeof factory === 'function'
		? factory
		: function () { return factory; }
}

function fromLoader (value) {
	return value && value.__es5Module ? value.__es5Module : value;
}

function toLoader (value) {
	return {
		// for real ES6 modules to consume this module
		'default': value,
		// for modules transpiled from ES6
		__es5Module: value
	};
}


// initialize rave boot sequence
exports.init(context);

// eval rave's minimal set of startup modules ("hooks")
define = exports.simpleDefine(context);


;define('rave@0.4.3/pipeline/locateAsIs', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = locateAsIs;

function locateAsIs (load) {
	return load.name;
}

});


;define('rave@0.4.3/pipeline/translateAsIs', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = translateAsIs;

function translateAsIs (load) {
	return load.source;
}

});


;define('rave@0.4.3/lib/path', ['require', 'exports', 'module'], function (require, exports, module, define) {var absUrlRx, findDotsRx;

absUrlRx = /^\/|^[^:]+:\/\//;
findDotsRx = /(\.)(\.?)(?:$|\/([^\.\/]+.*)?)/g;

/** @module path */
module.exports = {
	isAbsUrl: isAbsUrl,
	isRelPath: isRelPath,
	joinPaths: joinPaths,
	ensureEndSlash: ensureEndSlash,
	ensureExt: ensureExt,
	removeExt: removeExt,
	reduceLeadingDots: reduceLeadingDots,
	splitDirAndFile: splitDirAndFile
};

/**
 * Returns true if the url is absolute (not relative to the document)
 * @param {string} url
 * @return {Boolean}
 */
function isAbsUrl (url) {
	return absUrlRx.test(url);
}

/**
 * Returns true if the path provided is relative.
 * @param {string} path
 * @return {Boolean}
 */
function isRelPath (path) {
	return path.charAt(0) == '.';
}

/**
 * Joins path parts together.
 * @param {...string} parts
 * @return {string}
 */
function joinPaths () {
	var result, parts;
	parts = Array.prototype.slice.call(arguments);
	result = [parts.pop() || ''];
	while (parts.length) {
		result.unshift(ensureEndSlash(parts.pop()))
	}
	return result.join('');
}

/**
 * Ensures a trailing slash ("/") on a string.
 * @param {string} path
 * @return {string}
 */
function ensureEndSlash (path) {
	return path && path.charAt(path.length - 1) !== '/'
		? path + '/'
		: path;
}

/**
 * Checks for an extension at the end of the url or file path.  If one isn't
 * specified, it is added.
 * @param {string} path is any url or file path.
 * @param {string} ext is an extension, starting with a dot.
 * @returns {string} a url with an extension.
 */
function ensureExt (path, ext) {
	var hasExt = path.lastIndexOf(ext) > path.lastIndexOf('/');
	return hasExt ? path : path + ext;
}

/**
 * Removes a file extension from a path.
 * @param {string} path
 * @returns {string} path without a file extension.
 */
function removeExt (path) {
	var dotPos = path.lastIndexOf('.'), slashPos = path.lastIndexOf('/');
	return dotPos > slashPos ? path.slice(0, dotPos) : path;
}

/**
 * Normalizes a CommonJS-style (or AMD) module id against a referring
 * module id.  Leading ".." or "." path specifiers are folded into
 * the referer's id/path.  Interprets module ids of "." and ".." as meaning
 * "grab the module whose name is the same as my folder or parent folder".
 * These special folder ids are not included in the AMD spec, but seem to
 * work in RequireJS, curl.js, and dojo -- as well as node.js.
 * @param {string} childId
 * @param {string} refId
 * @return {string}
 */
function reduceLeadingDots (childId, refId) {
	var removeLevels, normId, levels, diff;

	if (isRelPath(childId)) {
		// detect if childId refers to a directory or to a module
		removeLevels = childId.slice(-1) === '.' ? 0 : 1;

		// replaceDots() also counts levels.
		normId = childId.replace(findDotsRx, replaceDots);

		levels = refId.split('/');
		diff = levels.length - removeLevels;

		if (diff < 0) {
			// This is an attempt to navigate above parent module.
			// maybe this is a url? Punt and return url;
			return childId;
		}

		levels.splice(diff, removeLevels);

		// normId || [] prevents concat from adding extra "/" when
		// normId is reduced to a blank string.
		return levels.concat(normId || []).join('/');
	}
	else {
		return childId;
	}

	function replaceDots (m, dot, dblDot, remainder) {
		if (dblDot) removeLevels++;
		return remainder || '';
	}
}

function splitDirAndFile (url) {
	var parts, file;
	parts = url.split('/');
	file = parts.pop();
	return [
		parts.join('/'),
		file
	];
}

});


;define('rave@0.4.3/lib/beget', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = beget;

function Begetter () {}
function beget (base) {
	var obj;
	Begetter.prototype = base;
	obj = new Begetter();
	Begetter.prototype = null;
	return obj;
}

});


;define('rave@0.4.3/lib/fetchText', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = fetchText;

function fetchText (url, callback, errback) {
	var xhr;
	xhr = new XMLHttpRequest();
	xhr.open('GET', url, true);
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.status < 400) {
				callback(xhr.responseText);
			}
			else {
				errback(
					new Error(
						'fetchText() failed. url: "' + url
						+ '" status: ' + xhr.status + ' - ' + xhr.statusText
					)
				);
			}
		}
	};
	xhr.send(null);
}

});


;define('rave@0.4.3/lib/addSourceUrl', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = addSourceUrl;

function addSourceUrl (url, source) {
	var safeUrl = stripPort(url);
	return source
		+ '\n//# sourceURL='
		+ encodeURI(safeUrl)
		+ '\n';
}

function stripPort (url) {
	var u;
	// Until Safari fixes their debugger or we have a reliable way to sniff for
	// the broken debugger, we'll have to sniff the user agent.  Note: this
	// sniff happens in debugging code only, not in production code.
	if (typeof URL !== 'undefined' && isSafari()) {
		u = new URL(url);
	}
	return u && u.port
		? u.protocol + '//'
			+ u.hostname
			// yes, this is crazy. Safari, what gives????
			+ (u.port ? ':' + u.port + '/.' : '')
			+ u.pathname
			+ u.search
			+ u.hash
		: url;
}

function isSafari () {
	var ua = navigator.userAgent;
	return ua.indexOf('Safari') >= 0 && ua.indexOf('Chrome') < 0;
}

});


;define('rave@0.4.3/lib/debug/injectScript', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = injectScript;

// This used to be a script injection routine, but indirect eval seems
// to work just as well in major browsers.
function injectScript (source) {
	(1, eval)(source);
}

});


;define('rave@0.4.3/load/predicate', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.composePredicates = composePredicates;
exports.createPackageMatcher = createPackageMatcher;
exports.createPatternMatcher = createPatternMatcher;
exports.createExtensionsMatcher = createExtensionsMatcher;

function composePredicates (matchPackage, matchPattern, matchExtensions, override) {
	var predicate, predicates = [];

	predicate = override.predicate || always;

	if (override.package && override.package !== '*') {
		predicates.push(matchPackage);
	}

	if (override.pattern) {
		predicates.push(matchPattern);
	}

	if (override.extensions) {
		predicates.push(matchExtensions);
	}

	return predicates.length > 0
		? testAllPredicates
		: predicate;

	function testAllPredicates (load) {
		for (var i = 0, len = predicates.length; i < len; i++) {
			if (!predicates[i](load)) return false;
		}
		return predicate.apply(this, arguments);
	}
}

function createPackageMatcher (samePackage, override) {
	return function (load) {
		return samePackage(load.name, override.package);
	};
}

function createPatternMatcher (override) {
	var patternRx = typeof override.pattern === 'string'
		? new RegExp(override.pattern)
		: override.pattern;
	return function (load) {
		return patternRx.test(load.name);
	};
}

function createExtensionsMatcher (override) {
	var extensions = override.extensions && override.extensions.map(function (ext) {
		return ext.charAt(0) === '.' ? ext : '.' + ext;
	});
	return function (load) {
		var name = load.name;
		return extensions.some(function (ext) {
			return name.slice(-ext.length) === ext;
		});
	};
}

function always () { return true; }

});


;define('rave@0.4.3/load/specificity', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.compare = compareFilters;
exports.pkgSpec = packageSpecificity;
exports.patSpec = patternSpecificity;
exports.extSpec = extensionSpecificity;
exports.predSpec = predicateSpecificity;

function packageSpecificity (filter) {
	if (!filter.package || filter.package === '*') return 0;
//	else if (filter.package.indexOf('*') >= 0) return 1;
	else return 1;
}

function patternSpecificity (filter) {
	return filter.pattern ? 1 : 0;
}

function extensionSpecificity (filter) {
	return filter.extensions && filter.extensions.length
		? 1 / filter.extensions.length
		: 0;
}

function predicateSpecificity (filter) {
	return filter.predicate ? 1 : 0;
}

function compareFilters (a, b) {
	// packages have highest priority
	var diff = packageSpecificity(a) - packageSpecificity(b);
	// after packages, patterns are priority
	if (diff === 0) diff = patternSpecificity(a) - patternSpecificity(b);
	// next priority is extensions
	if (diff === 0) diff = extensionSpecificity(a) - extensionSpecificity(b);
	// last priority is custom predicates
	if (diff === 0) diff = predicateSpecificity(a) - predicateSpecificity(b);
	// sort higher specificity filters to beginning of array
	return -diff;
}


});


;define('rave@0.4.3/lib/uid', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.create = createUid;
exports.parse = parseUid;
exports.getName = getName;

function createUid (descriptor, normalized) {
	return /*descriptor.pmType + ':' +*/ descriptor.name
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
	};
}


function getName (uid) {
	return uid.split("#").pop();
}


});


;define('rave@0.4.3/lib/find/createCodeFinder', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = createCodeFinder;

// Export private functions for testing
createCodeFinder.composeRx = composeRx;
createCodeFinder.skipTo = skipTo;

// Look for code transitions.
var defaultTransitionsRx = composeRx(
	// Detect strings, blank strings, double escapes, and comments.
	/(''?|""?|\\\\|\/\/|\/\*)/,
	// Detect RegExps by excluding division sign and comments
	/(?:[\-+*\/=\,%&|^!(;\{\[<>]\s*)(\/)(?!\/|\*)/,
	'g'
);

// RegExps to find end of strings, comments, RegExps in code
// We can't detect blank strings easily, so we handle those specifically.
var defaultSkippers = {
	"''": false,
	'""': false,
	'\\\\': false,
	"'": /[^\\]'/g,
	'"': /[^\\]"/g,
	'//': /\n|$/g,
	'/*': /\*\//g,
	'/': /[^\\]\//g
};

/**
 * Creates a function that will call a callback function with a set of matches
 * for each occurrence of a pattern match for a given RegExp.  Only true
 * JavaScript is searched.  Comments, strings, and RegExps are skipped.
 * The onMatch callback is called with a single parameter: an array containing
 * the result of calling the RegExp's exec() method.  If onMatch returns a
 * very large number, the pattern matching stops.
 * @param {RegExp} codeRx is a RegExp for the code pattern to find.
 * @param {RegExp} [codeTransitionsRx] is a RegExp to detect transitions into
 *   comments, strings, RegExps, etc.  If omitted, the default RegExp is suited
 *   to JavaScript code.
 * @param {function(matches:Array):number} [skip] is a function that returns
 *   a new position to resume searching the source code.
 * @returns {function(source:string, onMatch:function):string}
 */
function createCodeFinder (codeRx, codeTransitionsRx, skip) {
	var flags, comboRx;

	if (!codeTransitionsRx) codeTransitionsRx = defaultTransitionsRx;
	if (!skip) skip = skipNonCode;

	flags = 'g';
	if (codeRx.multiline) flags += 'm';
	if (codeRx.ignoreCase) flags += 'i';

	comboRx = composeRx(codeRx, codeTransitionsRx, flags);

	return function (source, onMatch) {
		var matches, index;

		comboRx.lastIndex = 0; // reset

		while (matches = comboRx.exec(source)) {

			index = skip(matches);

			if (index < 0) {
				// call onMatch and let it optionally skip forward
				index = onMatch(matches);
			}

			if (index >= 0) {
				comboRx.lastIndex = index;
			}

		}

		return source;
	};
}

function skipNonCode (matches) {
	var rx, trans, index;
	// pop off matches for regexp and other transitions
	rx = matches.pop();
	trans = matches.pop() || rx;
	if (!trans) return -1;
	if (defaultSkippers[trans]) {
		index = matches.index + matches[0].length;
		return skipTo(matches.input, defaultSkippers[trans], index);
	}
}

function skipTo (source, rx, index) {
	rx.lastIndex = index;

	if (!rx.test(source)) {
		throw new Error(
			'Unterminated comment, string, or RegExp at '
			+ index + ' near ' + source.slice(index - 50, 100)
		);
	}

	return rx.lastIndex;
}

function composeRx (rx1, rx2, flags) {
	return new RegExp(rx1.source + '|' + rx2.source, flags);
}

});


;define('rave@0.4.3/lib/es5Transform', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = {
	fromLoader: function (value) {
		return value && value.__es5Module ? value.__es5Module : value;
	},
	toLoader: function (module) {
		return {
			// for real ES6 modules to consume this module
			'default': module,
			// for modules transpiled from ES5
			__es5Module: module
		};
	}
};

});


;define('rave@0.4.3/lib/json/eval', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = jsonEval;

function jsonEval (source) {
	return eval('(' + source + ')');
}

});


;define('rave@0.4.3/pipeline/fetchAsText', ['require', 'exports', 'module', 'rave@0.4.3/lib/fetchText'], function (require, exports, module, $cram_r0, define) {module.exports = fetchAsText;

var fetchText = $cram_r0;

function fetchAsText (load) {
	return new Promise(function(resolve, reject) {
		fetchText(load.address, resolve, reject);
	});

}

});


;define('rave@0.4.3/pipeline/normalizeCjs', ['require', 'exports', 'module', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

module.exports = normalizeCjs;

var reduceLeadingDots = path.reduceLeadingDots;

function normalizeCjs (name, refererName, refererUrl) {
	return reduceLeadingDots(String(name), refererName || '');
}

});


;define('rave@0.4.3/load/override', ['require', 'exports', 'module', 'rave@0.4.3/load/predicate', 'rave@0.4.3/load/specificity', 'rave@0.4.3/lib/uid'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var predicate = $cram_r0;
var specificity = $cram_r1;
var parse = $cram_r2.parse;

exports.hooks = overrideHooks;
exports.hook = overrideHook;
exports.sortByPredicate = sortByPredicate;
exports.toFastOverride = toFastOverride;
exports.callHook = callHook;
exports.callNormalize = callNormalize;
exports.packageMatch = sameCommonJSPackages;

var notCalled = false;

function sortByPredicate (overrides) {
	return overrides.sort(specificity.compare);
}

/**
 * Creates a unified set of loader hooks given the overrides collected
 * from rave load extensions.
 * @param {Object} originalHooks is an object whose properties are the loader's
 *   original hooks (or at least the ones that were present before rave first
 *   overrode any hooks).
 * @param {Array} overrides is the collection of overrides to apply.  These
 *   must be concatenated with any previous overrides or the previous ones will
 *   be lost if this method is applied multiple times.
 * @returns {{normalize: Function, locate: Function, fetch: Function, translate: Function, instantiate: Function}}
 */
function overrideHooks (originalHooks, overrides) {
	var sorted;

	sorted = sortByPredicate(overrides)
		.map(toFastOverride);

	return {
		normalize: overrideHook('normalize', originalHooks.normalize, sorted, callNormalize),
		locate: overrideHook('locate', originalHooks.locate, sorted),
		fetch: overrideHook('fetch', originalHooks.fetch, sorted),
		translate: overrideHook('translate', originalHooks.translate, sorted),
		instantiate: overrideHook('instantiate', originalHooks.instantiate, sorted)
	};
}

/**
 * Creates an overridden loader hook given an array of overrides and the
 * name of the hook.
 * @private
 * @param {string} name is the name of the hook.
 * @param {function():*} originalHook is the loader's original hook.
 * @param {Array<Object>} overrides is the collection of rave extension
 *   override definitions.
 * @param {function} [eachOverride] is a function that creates a function that
 *   will test a predicate and possibly call a hook override.  Called for each
 *   override for the named hook.
 * @returns {function():*}
 */
function overrideHook (name, originalHook, overrides, eachOverride) {
	var hooks;

	if (!eachOverride) eachOverride = callHook;
	hooks = overrides.reduce(reduceByName, []);

	return hooks.length ? callHooks : originalHook;

	function callHooks () {
		var result;
		for (var i = 0, len = hooks.length; i < len; i++) {
			result = hooks[i].apply(this, arguments);
			if (result !== notCalled) return result;
		}
		return originalHook.apply(this, arguments);
	}

	function reduceByName (hooks, override) {
		if (override.hooks[name]) {
			hooks.push(eachOverride(override.predicate, override.hooks[name], notCalled));
		}
		return hooks;
	}

}

function callHook (predicate, hook, defaultValue) {
	return function (load) {
		return predicate(load) ? hook(load) : defaultValue;
	};
}

function callNormalize (predicate, normalize, defaultValue) {
	return function (name, refName, refUrl) {
		var normalized = normalize(name, refName, refUrl);
		return predicate({ name: normalized }) ? normalized : defaultValue;
	};
}

function toFastOverride (override) {
	var samePackage, pred;

	samePackage = override.samePackage || sameCommonJSPackages;

	pred = predicate.composePredicates(
		predicate.createPackageMatcher(samePackage, override),
		predicate.createPatternMatcher(override),
		predicate.createExtensionsMatcher(override),
		override
	);

	return {
		predicate: pred,
		hooks: override.hooks
	};
}

function sameCommonJSPackages (a, b) {
	return parse(a).pkgName === parse(b).pkgName;
}

});


;define('rave@0.4.3/lib/debug/nodeEval', ['require', 'exports', 'module', 'rave@0.4.3/lib/debug/injectScript'], function (require, exports, module, $cram_r0, define) {var injectScript = $cram_r0;

module.exports = nodeEval;

function nodeEval (global, require, exports, module, source, debugTransform) {
	var script;
	script = debugTransform(
		'__rave_node(function (require, exports, module, global) {'
		+ source
		+ '\n})\n'
	);
	global.__rave_node = __rave_node;
	try {
		injectScript(script);
	}
	finally {
		delete global.__rave_node;
	}
	function __rave_node (factory) {
		factory(require, exports, module, global);
	}
}

});


;define('rave@0.4.3/lib/find/requires', ['require', 'exports', 'module', 'rave@0.4.3/lib/find/createCodeFinder'], function (require, exports, module, $cram_r0, define) {module.exports = findRequires;

var createCodeFinder = $cram_r0;

var findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)/g;
var idMatch = 2;

var finder = createCodeFinder(findRValueRequiresRx);

function findRequires (source) {
	var deps, seen;

	deps = [];
	seen = {};

	finder(source, function (matches) {
		var id = matches[idMatch];
		if (id) {
			// push [relative] id into deps list and seen map
			if (!(id in seen)) {
				seen[id] = true;
				deps.push(id)
			}
		}
	});

	return deps;
}

});


;define('rave@0.4.3/lib/json/factory', ['require', 'exports', 'module', 'rave@0.4.3/lib/es5Transform', 'rave@0.4.3/lib/json/eval'], function (require, exports, module, $cram_r0, $cram_r1, define) {var es5Transform = $cram_r0;
var jsonEval = $cram_r1;

module.exports = jsonFactory;

function jsonFactory (loader, load) {
	return es5Transform.toLoader(jsonEval(load.source));
}

});


;define('rave@0.4.3/lib/createRequire', ['require', 'exports', 'module', 'rave@0.4.3/lib/es5Transform'], function (require, exports, module, $cram_r0, define) {module.exports = createRequire;

var es5Transform = $cram_r0;

function createRequire (loader, refId) {

	var require = function (id) { return syncRequire(id); };

	// Implement proposed require.async, just like Montage Require:
	// https://github.com/montagejs/mr, but with an added `names`
	// parameter.
	require.async = function (id) {
		var abs, args;
		try {
			abs = loader.normalize(id, refId);
		}
		catch (ex) {
			return Promise.reject(ex);
		}
		args = arguments;
		return loader.import(abs).then(function (value) {
			return getExports(args[1], value);
		});
	};

	require.named = syncRequire;

	return require;

	function syncRequire (id, names) {
		var abs, value;
		abs = loader.normalize(id, refId);
		value = loader.get(abs);
		return getExports(names, value);
	}
}

function getExports (names, value) {
	var exports, i;
	// only attempt to get names if an array-like object was supplied
	if (Object(names) === names && names.hasOwnProperty('length')) {
		exports = {};
		for (i = 0; i < names.length; i++) {
			exports[names[i]] = value[names[i]];
		}
		return exports;
	}
	else {
		return es5Transform.fromLoader(value);
	}
}

});


;define('rave@0.4.3/pipeline/instantiateNode', ['require', 'exports', 'module', 'rave@0.4.3/lib/find/requires'], function (require, exports, module, $cram_r0, define) {var findRequires = $cram_r0;

module.exports = instantiateNode;

function instantiateNode (nodeFactory) {
	return function (load) {
		var loader, deps, factory;

		loader = load.metadata.rave.loader;
		deps = findOrThrow(load);

		factory = nodeFactory(loader, load);

		return {
			deps: deps,
			execute: function () {
				return new Module(factory.apply(this, arguments));
			}
		};
	}
}

function findOrThrow (load) {
	try {
		return findRequires(load.source);
	}
	catch (ex) {
		ex.message += ' ' + load.name + ' ' + load.address;
		throw ex;
	}
}


});


;define('rave@0.4.3/pipeline/instantiateJson', ['require', 'exports', 'module', 'rave@0.4.3/lib/json/factory'], function (require, exports, module, $cram_r0, define) {var jsonFactory = $cram_r0;

module.exports = instantiateJson;

function instantiateJson (load) {
	var loader = load.metadata.rave.loader;
	return {
		execute: function () {
			return new Module(jsonFactory(loader, load));
		}
	};
}

});


;define('rave@0.4.3/lib/node/factory', ['require', 'exports', 'module', 'rave@0.4.3/lib/es5Transform', 'rave@0.4.3/lib/createRequire'], function (require, exports, module, $cram_r0, $cram_r1, define) {var es5Transform = $cram_r0;
var createRequire = $cram_r1;

module.exports = nodeFactory;

function nodeFactory (nodeEval) {
	return function (loader, load) {
		var name, source, exports, module, require;

		name = load.name;
		source = load.source;
		exports = {};
		module = { id: name, uri: load.address, exports: exports };
		require = createRequire(loader, name);

		return function () {
			nodeEval(global, require, exports, module, source);
			// figure out what author intended to export
			return exports === module.exports
				? exports // a set of named exports
				: es5Transform.toLoader(module.exports); // a single default export
		};
	};
}

});


;define('rave@0.4.3/lib/debug/nodeFactory', ['require', 'exports', 'module', 'rave@0.4.3/lib/node/factory', 'rave@0.4.3/lib/addSourceUrl'], function (require, exports, module, $cram_r0, $cram_r1, define) {var factory = $cram_r0;
var addSourceUrl = $cram_r1;

module.exports = nodeFactory;

function nodeFactory (nodeEval) {
	return function (loader, load) {
		return factory(debugEval)(loader, load);
		function debugEval (global, require, exports, module, source) {
			return nodeEval(global, require, exports, module, source, debugTransform);
		}
		// We must add the source url from within nodeEval to work around
		// browser bugs that prevent scripts from showing in the debugger
		// if the sourceURL line is inside a wrapper function.
		function debugTransform (source) {
			return addSourceUrl(load.address, source);
		}
	};
}

});


;define('rave@0.4.3/src/hooks', ['require', 'exports', 'module', 'rave@0.4.3/pipeline/normalizeCjs', 'rave@0.4.3/pipeline/locateAsIs', 'rave@0.4.3/pipeline/fetchAsText', 'rave@0.4.3/pipeline/translateAsIs', 'rave@0.4.3/pipeline/instantiateNode', 'rave@0.4.3/lib/debug/nodeFactory', 'rave@0.4.3/lib/debug/nodeEval', 'rave@0.4.3/pipeline/instantiateJson', 'rave@0.4.3/lib/path', 'rave@0.4.3/lib/beget', 'rave@0.4.3/load/override'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, $cram_r5, $cram_r6, $cram_r7, $cram_r8, $cram_r9, $cram_r10, define) {var normalizeCjs = $cram_r0;
var locateAsIs = $cram_r1;
var fetchAsText = $cram_r2;
var translateAsIs = $cram_r3;
var instantiateNode = $cram_r4;
var nodeFactory = $cram_r5;
var nodeEval = $cram_r6;
var instantiateJson = $cram_r7;
var path = $cram_r8;
var beget = $cram_r9;
var override = $cram_r10;

module.exports = baseHooks;

function baseHooks (context) {
	var nativeHooks, resetOverride, raveOverride, jsonOverride, overrides,
		newHooks;

	nativeHooks = getLoaderHooks(context.loader);
	context.load = { nativeHooks: nativeHooks };

	context = beget(context);

	// we need this until Loader spec and shim stabilize
	resetOverride = {
		hooks: {
			normalize: normalizeCjs,
			fetch: fetchAsText,
			translate: translateAsIs
		}
	};

	// load things in rave package
	raveOverride = {
		package: 'rave',
		hooks: {
			locate: locateRaveWithContext(context),
			instantiate: instantiateNode(nodeFactory(nodeEval))
		}
	};

	// load json metadata files
	jsonOverride = {
		extensions: [ '.json' ],
		hooks: {
			locate: withContext(context, locateAsIs),
			instantiate: instantiateJson
		}
	};

	overrides = [resetOverride, raveOverride, jsonOverride];
	newHooks = override.hooks(nativeHooks, overrides);
	setLoaderHooks(context.loader, newHooks);

	return context;
}

function getLoaderHooks (loader) {
	return {
		normalize: loader.normalize,
		locate: loader.locate,
		fetch: loader.fetch,
		translate: loader.translate,
		instantiate: loader.instantiate
	};
}

function setLoaderHooks (loader, hooks) {
	for (var p in hooks) loader[p] = hooks[p];
	return loader;
}

function withContext (context, func) {
	return function (load) {
		load.metadata.rave = context;
		return func.call(this, load);
	};
}

function locateRaveWithContext (context) {
	var parts = context.raveScript.split('/');
	parts.pop(); // script file
	parts.pop(); // script directory
	var base = parts.join('/');
	return function (load) {
		load.metadata.rave = context;
		return path.joinPaths(base, path.ensureExt(load.name, '.js'));
	};
}

});


;define('rave@0.4.3/lib/run/applyFirstMain', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = applyFirstMain;

function applyFirstMain (context, extensions) {
	var appliedMain;
	extensions.map(function (extension) {
		var api = extension.api;
		if (api && api.main) {
			if (appliedMain) {
				throw new Error('Found multiple extensions with main().');
			}
			appliedMain = Promise.resolve(api.main(Object.create(context))).then(function () {
				return true;
			});
		}
	});
	return Promise.resolve(appliedMain);
}

});


;define('rave@0.4.3/lib/run/initApplication', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = initApplication;

function initApplication (context) {
	var mainModule;
	mainModule = context.app && context.app.main;
	if (mainModule) {
		return runMain(context, mainModule)
			.then(function () { return context; });
	}
	else {
		return context;
	}
}

function runMain (context, mainModule) {
	return require.async(mainModule)
		.then(function (main) {
			if (typeof main === 'function') {
				main(Object.create(context));
			}
			else if (typeof main.main === 'function') {
				main.main(Object.create(context));
			}
		});
}

});


;define('rave@0.4.3/lib/crawl/common', ['require', 'exports', 'module'], function (require, exports, module, define) {// TODO: don't load metadata for packages that have already been crawled

// main exports

exports.crawl = crawl;
exports.load = typeof require.async !== 'undefined'
	? load
	: nativeLoad;

// exports for testing

exports.childIterator = childIterator;
exports.store = store;
exports.collectMetadata = collectMetadata;
exports.collectOverrides = collectOverrides;
exports.applyOverrides = applyOverrides;
exports.start = start;
exports.proceed = proceed;
exports.end = end;

function crawl (context) {
	var load = start(context.load);
	return load(context, context.fileUrl)
		.then(proceed(applyOverrides))
		.then(proceed(collectOverrides))
		.then(proceed(store('metadata')))
		.then(proceed(context.getChildrenNames))
		.then(proceed(childIterator))
		.then(proceed(store('children')))
		.then(proceed(context.convert))
		// TODO: start collecting in the context, context.collect?
		.then(proceed(collectMetadata))
		.then(end);
}

function load (context, fileUrl) {
	return require.async(fileUrl);
}

function nativeLoad (context, fileUrl) {
	return Promise.resolve(require(fileUrl));
}

function childIterator (context, names) {
	var childCrawlers = names.map(function (name) {
		return context.childCrawler(context, name);
	});
	return Promise.all(childCrawlers);
}

function store (key) {
	return function (context, value) {
		context[key] = value;
		return context;
	};
}

function collectMetadata (context, data) {
	context.all.push(data);
	return data;
}

function collectOverrides (context, data) {
	var key, overrides, missing;
	if (data && data.rave) {
		overrides = data.rave.overrides;
		for (key in overrides) {
			context.overrides[key] = overrides[key];
		}
		missing = data.rave.missing;
		for (key in missing) {
			context.missing[key] = missing[key];
		}
	}
	return data;
}

function applyOverrides (context, data) {
	if (data) {
		_applyOverrides(false, context.overrides, data);
		_applyOverrides(true, context.missing, data);
	}
	return data;
}

function _applyOverrides (ifMissing, source, data) {
	var overrides, key;
	if (data.name in source) {
		overrides = source[data.name];
		for (key in overrides) {
			if (!ifMissing || !(key in data)) {
				data[key] = overrides[key];
			}
		}
	}
}

function start (func) {
	return function (state, value) {
		return resolveStateAndValue(func, state, value);
	}
}

function proceed (func) {
	return function (stateAndValue) {
		var state = stateAndValue[0], value = stateAndValue[1];
		return resolveStateAndValue(func, state, value);
	};
}

function end (stateAndValue) {
	return stateAndValue[1];
}

function resolveStateAndValue (func, state, value) {
	return Promise.resolve(func.call(this, state, value))
		.then(function (nextValue) {
			return [state, nextValue];
		});
}

});


;define('rave@0.4.3/lib/amd/captureDefines', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = captureDefines;

function captureDefines (amdEval) {
	var result;

	define.amd = { jQuery: {} };

	return function (load) {
		result = { named: [], isAnon: false, anon: void 0, called: false };
		return capture(amdEval, define, load, result);
	};

	function define () {
		return _define(result, arguments);
	}
}

function capture (amdEval, define, load, result) {
	try {
		amdEval(global, define, load.source);
	}
	catch (ex) {
		ex.message += ' in ' + load.name;
		throw ex;
	}
	if (!result.called) {
		throw new Error('AMD define not called in ' + load.name);
	}
	return result;
}

function _define (result, args) {
	var len, def, arg, undef;

	len = args.length;

	result.called = true;

	// last arg is always the factory (or a plain value)
	def = {
		factory: ensureFactory(args[--len]),
		depsList: undef,
		name: undef
	};

	// if there are more args
	if (len) {
		// get second-to-last arg
		arg = args[--len];
		if (typeof arg === 'string') {
			def.name = arg;
		}
		else {
			def.depsList = arg;
		}
	}

	// if there are at least one more args and it's a string
	if (len && typeof args[--len] === 'string') {
		def.name = args[len];
	}

	// if we didn't consume exactly the right number of args
	if (len !== 0) {
		throw new Error('Unparsable AMD define arguments ['
			+ Array.prototype.slice.call(args) +
			']'
		);
	}

	if (!def.name) {
		if (result.isAnon) {
			throw new Error('Multiple anon defines');
		}
		result.isAnon = true;
		result.anon = def;
	}
	else {
		result.named.push(def);
	}
}

function ensureFactory (thing) {
	return typeof thing === 'function'
		? thing
		: function () { return thing; }
}

});


;define('rave@0.4.3/lib/script/factory', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = scriptFactory;

function scriptFactory (scriptEval) {
	return function (loader, load) {
		return create(scriptEval, load.source);
	};
}

function create (scriptEval, source) {
	return function () { scriptEval(source); };
}

});


;define('rave@0.4.3/lib/createNormalizer', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = createNormalizer;

function createNormalizer (idTransform, map, normalize) {
	return function (name, refererName, refererUrl) {
		var normalized = normalize(name, refererName, refererUrl);
		return idTransform(map(normalized, refererName), refererName, refererUrl);
	};
}

});


;define('rave@0.4.3/lib/auto/assembleAppContext', ['require', 'exports', 'module', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, define) {var join = $cram_r0.joinPaths;

module.exports = assembleAppContext;

function assembleAppContext (context) {
	// TODO: if no main modules found, look for one in a conventional place
	// TODO: warn if multiple main modules were found, but only the first was run
	var first;

	first = context.metadata[0]; // precondition: must be at least one

	context.app = {
		name: first.name,
		main: join(first.name, first.main),
		metadata: first
	};

	return createEnv(context, first);
}

function createEnv (context, metadata) {
	var metaEnv, key;

	if (!context.env) context.env = {};

	metaEnv = metadata.metadata.rave;
	metaEnv = metaEnv && metaEnv.env || {};

	for (key in metaEnv) {
		context.env[key] = metaEnv[key];
	}

	if (!('debug' in context.env)) context.env.debug = true;

	return context;
}

});


;define('rave@0.4.3/lib/run/gatherExtensions', ['require', 'exports', 'module', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

module.exports = gatherExtensions;

function gatherExtensions (context) {
	var seen, name, pkg, promises, extensionMeta;
	seen = {};
	promises = [];
	for (name in context.packages) {
		pkg = context.packages[name];
		// packages are keyed by versioned and unversioned names
		if (!(pkg.name in seen)) {
			seen[pkg.name] = true;
			if (pkg.rave) {
				extensionMeta = pkg.rave;
				if (typeof extensionMeta === 'string') {
					extensionMeta = { extension: extensionMeta };
				}
				if (extensionMeta.extension) {
					promises.push(initExtension(context, pkg.name, extensionMeta.extension));
				}

			}
		}
	}
	return Promise.all(promises);
}

function initExtension (context, packageName, moduleName) {
	return fetchExtension(path.joinPaths(packageName, moduleName))
		.then(extractExtensionCtor)
		.then(function (api) {
			return createExtensionApi(context, api);
		})
		['catch'](function (ex) {
			ex.message = 'Failed to initialize rave extension, "'
				+ packageName + '": ' + ex.message;
			throw ex;
		})
		.then(function (api) {
			return { name: packageName, api: api };
		});
}

function fetchExtension (extModuleName) {
	return require.async(extModuleName);
}

function extractExtensionCtor (extModule) {
	var create;
	if (extModule) {
		create = typeof extModule === 'function'
			? extModule
			: extModule.create;
	}
	if (!create) {
		throw new Error('API not found.');
	}
	return create;
}

function createExtensionApi (context, extension) {
	return extension(context);
}

});


;define('rave@0.4.3/lib/metadata', ['require', 'exports', 'module', 'rave@0.4.3/lib/uid', 'rave@0.4.3/lib/path', 'rave@0.4.3/lib/beget'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var parseUid = $cram_r0.parse;
var path = $cram_r1;
var beget = $cram_r2;

module.exports = {
	findPackage: findPackageDescriptor,
	findDepPackage: findDependentPackage,
	moduleType: moduleType
};

function findPackageDescriptor (descriptors, fromModule) {
	var parts, pkgName;
	parts = parseUid(fromModule);
	pkgName = parts.pkgUid || parts.pkgName;
	return descriptors[pkgName];
}

function findDependentPackage (descriptors, fromPkg, depName) {
	var parts, pkgName, depPkgUid;

	// ensure we have a package descriptor, not a uid
	if (typeof fromPkg === 'string') fromPkg = descriptors[fromPkg];

	parts = parseUid(depName);
	pkgName = parts.pkgUid || parts.pkgName;

	if (fromPkg && (pkgName === fromPkg.name || pkgName === fromPkg.uid)) {
		// this is the same the package
		return fromPkg;
	}
	else {
		// get dep pkg uid
		depPkgUid = fromPkg ? fromPkg.deps[pkgName] : pkgName;
		return depPkgUid && descriptors[depPkgUid];
	}
}

function moduleType (descriptor) {
	var moduleTypes;

	moduleTypes = descriptor.moduleType;

	if (hasModuleType(moduleTypes, 'amd')) {
		return 'amd';
	}
	else if (hasModuleType(moduleTypes, 'node')) {
		return 'node';
	}
	else if (hasModuleType(moduleTypes, 'globals')) {
		return 'globals';
	}

}

function hasModuleType (moduleTypes, type) {
	return moduleTypes && moduleTypes.indexOf(type) >= 0;
}

});


;define('rave@0.4.3/lib/crawl/npm', ['require', 'exports', 'module', 'rave@0.4.3/lib/path', 'rave@0.4.3/lib/crawl/common'], function (require, exports, module, $cram_r0, $cram_r1, define) {var join = $cram_r0.joinPaths;
var common = $cram_r1;

// main exports

exports.crawl = npmCrawl;

// exports for testing

exports.npmLoad = npmLoad;
exports.npmContext = npmContext;
exports.npmSetState = npmSetState;
exports.npmChildCrawler = npmChildCrawler;
exports.npmDependencies = npmDependencies;

var crawl = common.crawl;
var load = common.load;

function npmCrawl (convert, rootUrl) {
	var crawler = {
		load: npmLoad,
		getChildrenNames: npmDependencies,
		convert: convert
	};
	var context = npmContext(crawler, rootUrl, '');

	context.childCrawler = npmChildCrawler;
	context.all = [];

	return crawl(context)
		.then(function (root) {
			return {
				root: root,
				all: context.all
			}
		});
}

function npmContext (base, rootUrl, name) {
	var ctx = Object.create(base);
	ctx.parent = base;
	ctx.overrides = Object.create(base.overrides || null);
	ctx.missing = Object.create(base.missing || null);
	return npmSetState(ctx, rootUrl, name);
}

function npmSetState (ctx, rootUrl, name) {
	var fileType = 'package.json';
	ctx.name = name;
	ctx.pmType = 'npm';
	ctx.fileType = fileType;
	ctx.fileUrl = join(rootUrl, fileType);
	ctx.depFolder = join(rootUrl, 'node_modules');
	ctx.rootUrl = rootUrl;
	return ctx;
}

function npmChildCrawler (context, name) {
	var childRoot = join(context.depFolder, name);
	var childCtx = npmContext(context, childRoot, name);
	return crawl(childCtx);

}

function npmDependencies (context, data) {
	return Object.keys(data.metadata.dependencies || {})
		.concat(Object.keys(data.metadata.peerDependencies || {}));
}

function npmLoad (context, fileUrl) {
	return load(context, fileUrl)
		['catch'](function (ex) {
			return npmTraverseUp(context, fileUrl);
		});
}

function npmTraverseUp (context, fileUrl) {
	var grandParent, grandRoot;
	// /client/node_modules/foo/node_modules/bar/package.json
	// /client/node_modules/bar/package.json

	if (!context.origFileUrl) context.origFileUrl = fileUrl;

	grandParent = context.parent && context.parent.parent;
	if (!grandParent || !grandParent.depFolder) {
		throw new Error('Did not find ' + context.origFileUrl);
	}

	grandRoot = join(grandParent.depFolder, context.name);
	npmSetState(context, grandRoot, context.name);

	return npmLoad(context, context.fileUrl);
}

});


;define('rave@0.4.3/lib/crawl/bower', ['require', 'exports', 'module', 'rave@0.4.3/lib/path', 'rave@0.4.3/lib/crawl/common'], function (require, exports, module, $cram_r0, $cram_r1, define) {var join = $cram_r0.joinPaths;
var common = $cram_r1;

// main exports

exports.crawl = bowerCrawl;

// exports for testing

exports.bowerLoad = bowerLoad;
exports.bowerContext = bowerContext;
exports.bowerSetState = bowerSetState;
exports.bowerChildCrawler = bowerChildCrawler;
exports.bowerDependencies = bowerDependencies;

var crawl = common.crawl;
var load = common.load;

function bowerCrawl (convert, rootUrl) {
	var crawler = {
		globalDepFolder: join(rootUrl, 'bower_components'),
		load: bowerLoad,
		getChildrenNames: bowerDependencies,
		convert: convert
	};
	var context = bowerContext(crawler, rootUrl, '');

	context.childCrawler = bowerChildCrawler;
	context.all = [];

	return crawl(context)
		.then(function (root) {
			return {
				root: root,
				all: context.all
			}
		});
}

function bowerLoad (context, fileUrl) {
	return load(context, fileUrl)
		['catch'](switchToPackageJson)
		['catch'](provideBlankData);

	function switchToPackageJson () {
		var fileType = context.fileType = 'package.json';
		context.fileUrl = join(context.rootUrl, fileType);
		return load(context, context.fileUrl);
	}

	function provideBlankData () {
		context.fileType = '';
		return null;
	}
}

function bowerContext (base, rootUrl, name) {
	var ctx = Object.create(base);
	ctx.name = name;
	ctx.overrides = Object.create(base.overrides || null);
	ctx.missing = Object.create(base.missing || null);
	return bowerSetState(ctx, rootUrl, name);
}

function bowerSetState (ctx, rootUrl, name) {
	var fileType = 'bower.json';
	ctx.name = name;
	ctx.pmType = 'bower';
	ctx.fileType = fileType;
	ctx.fileUrl = join(rootUrl, fileType);
	ctx.depFolder = join(rootUrl, 'bower_components');
	ctx.rootUrl = rootUrl;
	return ctx;
}

function bowerChildCrawler (context, name) {
	var childRoot = join(context.globalDepFolder, name);
	var childCtx = bowerContext(context, childRoot, name);
	return crawl(childCtx);
}

function bowerDependencies (context, data) {
	return context.fileType === 'bower.json'
		? Object.keys(data.metadata.dependencies || {})
		: [];
}


});


;define('rave@0.4.3/lib/debug/captureDefines', ['require', 'exports', 'module', 'rave@0.4.3/lib/addSourceUrl', 'rave@0.4.3/lib/amd/captureDefines'], function (require, exports, module, $cram_r0, $cram_r1, define) {var addSourceUrl = $cram_r0;
var origCaptureDefines = $cram_r1;

module.exports = captureDefines;

function captureDefines (amdEval) {
	return function (load) {
		return origCaptureDefines(_eval)(load);
		function _eval (global, define, source) {
			return amdEval(global, define, addSourceUrl(load.address, source));
		}
	};
}

});


;define('rave@0.4.3/lib/debug/amdEval', ['require', 'exports', 'module', 'rave@0.4.3/lib/debug/injectScript'], function (require, exports, module, $cram_r0, define) {var injectScript = $cram_r0;

module.exports = amdEval;

var noDefine = {};

function amdEval (global, define, source) {
	var prevDefine = 'define' in global ? global.define : noDefine;
	global.define = define;
	try {
		injectScript(source);
	}
	finally {
		if (global.define === noDefine) {
			delete global.define;
		}
		else {
			global.define = prevDefine;
		}
	}
}

});


;define('rave@0.4.3/lib/debug/scriptFactory', ['require', 'exports', 'module', 'rave@0.4.3/lib/script/factory', 'rave@0.4.3/lib/addSourceUrl'], function (require, exports, module, $cram_r0, $cram_r1, define) {var factory = $cram_r0;
var addSourceUrl = $cram_r1;

module.exports = scriptFactory;

function scriptFactory (scriptEval) {
	return function (loader, load) {
		var address = load.address;
		return factory(debugEval)(loader, load);
		function debugEval (source) {
			var debugSrc = addSourceUrl(address, source);
			scriptEval(debugSrc);
		}
	};
}

});


;define('rave@0.4.3/lib/debug/scriptEval', ['require', 'exports', 'module', 'rave@0.4.3/lib/debug/injectScript'], function (require, exports, module, $cram_r0, define) {var injectScript = $cram_r0;

module.exports = scriptEval;

function scriptEval (source) {
	injectScript(source);
}

});


;define('rave@0.4.3/lib/convert/common', ['require', 'exports', 'module', 'rave@0.4.3/lib/uid'], function (require, exports, module, $cram_r0, define) {var createUid = $cram_r0.create;

// main exports

exports.transform = transformData;

// exports for testing

exports.createDepHashMap = createDepHashMap;

function transformData (orig) {
	var metadata, clone;

	// create overridable copy of metadata
	metadata = orig.metadata || {}; // metadata can be null for bower

	// copy some useful crawling data
	clone = {
		metadata: metadata,
		name: metadata.name || orig.name,
		main: metadata.main,
		version: metadata.version || '0.0.0',
		rave: metadata.rave,
		pmType: orig.pmType,
		fileType: orig.fileType,
		location: orig.rootUrl, // renamed!
		depFolder: orig.depFolder
	};

	// add uid
	clone.uid = createUid(clone);

	// convert children array to deps hashmap
	clone.deps = createDepHashMap(orig);

	return clone;
}

function createDepHashMap (data) {
	return data.children.reduce(function (hashMap, child) {
		hashMap[child.name] = child.uid;
		return hashMap;
	}, {});
}

});


;define('rave@0.4.3/debug', ['require', 'exports', 'module', 'rave@0.4.3/lib/uid', 'rave@0.4.3/lib/es5Transform', 'rave@0.4.3/lib/metadata'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var uid = $cram_r0;
var es5Transform = $cram_r1;
var metadata = $cram_r2;

module.exports = {
	start: startDebug,
	assertNoConflicts: detectExtensionConflict,
	assertRavePackage: assertRavePackage,
	installDebugHooks: installDebugHooks,
	logOverrides: logOverrides
};

var debugging = "\
┏( ˆ◡ˆ)┛ ┗(ˆ◡ˆ )┓ Welcome to the RaveJS debug party! ┏( ˆ◡ˆ)┛ ┗(ˆ◡ˆ )┓\n\
\n\
If you see some 404s for JSON files, that's ok! \
They'll go away when you build your app.\n\
If the 404s are spoiling your debug party, the README.md shows how to \
evict them.\n";

var replCommands = "Available commands:\n\
-> rave.dump() - returns rave's context to be viewed or manipulated.\n\
-> rave.version() - shows rave's version.\n\
-> rave.checkVersions() - checks if extensions are compatible.\n\
-> rave.restore() - restores any previous global rave variable and returns rave\
-> rave.help() - shows these commands.\n\
-> what else should we provide? File a github issue!";

var replEnabled = "Rave REPL enabled! (experimental)\n"
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

var unknownPackage = "Unknown package when importing {0} from {1}\n\
Did you forget to specify `--save` when installing?";

var wrongModuleType = "Possible moduleType mismatch? Module {name} appears \
to be of type {sourceType}? \nPlease ask the package author to add or update \
moduleType.";

var overriddenPackage = "Package `{overrider}` overrode metadata properties \
of package `{overridee}`.";

var defaultedPackage = "Package `{overrider}` provided default metadata for \
missing properties of package `{overridee}`.";

var uniqueThing = {};

function startDebug (context) {
	var prev, rave, message;

	console.log(debugging);

	prev = 'rave' in global ? global.rave : uniqueThing;
	rave = global.rave = {};

	message = render({}, replEnabled);

	// TODO: load a debug REPL module?
	rave.dump = function () {
		return context;
	};
	rave.version = function () { return findVersion(context); };
	rave.checkVersions = function () {
		runSemverOnExtensions(context);
	};
	rave.help = function () {
		console.log(replCommands);
	};
	rave.restore = function () {
		if (prev === uniqueThing) {
			delete global.rave;
		}
		else {
			global.rave = prev;
		}
		return rave;
	};

	console.log(message);

}

function assertRavePackage (context) {
	if (!('rave' in context.packages)) {
		throw new Error('rave package not found.  Did you forget to use --save when installing?');
	}
	return context;
}

function installDebugHooks (context) {
	var normalize = context.loader.normalize;
	// log an error if rave encounters an unknown package
	context.loader.normalize = function (name, refName, refUrl) {
		try {
			var normalized = normalize(name, refName, refUrl);
		}
		catch (ex) {
			console.error(render(arguments, unknownPackage));
			throw ex;
		}
		return normalized;
	};
	// log an error if it looks like an incorrect module type was applied
	// override instantiate to catch throws of ReferenceError
	// errors can happen when instantiate hook runs (AMD) or when returned factory runs (node)
	// if /\bdefine\b/ in message, module is AMD, but was not declared as AMD
	// if /\brequire\b|\exports\b|\bmodule\b/ in message, module is node, but was not declared as node
	var instantiate = context.loader.instantiate;
	context.loader.instantiate = function (load) {
		try {
			return Promise.resolve(instantiate(load)).then(createCheckedFactory, checkError);
		}
		catch (ex) {
			checkError(ex);
			throw ex;
		}
		function createCheckedFactory (result) {
			var execute = result.execute;
			if (execute) {
				result.execute = function () {
					try {
						return execute.apply(this, arguments);
					}
					catch (ex) {
						checkError(ex);
						throw ex;
					}
				}
			}
			return result;
		}
		function checkError (ex) {
			var info = {
				name: load.name,
				declaredType: metadata.findPackage(context.packages, load.name).moduleType
			};
			if (ex instanceof ReferenceError) {
				if (!/\bdefine\b/.test(ex.message)) {
					if (/\brequire\b|\exports\b|\bmodule\b/.test(ex.message)) {
						info.sourceType = 'node';
					}
				}
				else {
					info.sourceType = 'AMD';
				}
				if (info.sourceType) {
					console.error(render(info, wrongModuleType));
				}
			}
			return ex;
		}
	};
	return context;
}

function findVersion (context) {
	try {
		return context.packages.rave.metadata.version;
	}
	catch (ex) {
		console.error('Rave metadata not found! Did you forget to install rave with the --save option?');
		return "(unknown version)";
	}
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
	return context;
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
	if (metadata) {
		for (var i = 0; i < metadata.length; i++) {
			if (metadata.resolutions && metadata.resolutions.rave) {
				return true;
			}
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

function logOverrides (context) {
	var seen, name, pkg, extMeta, oname;
	seen = {};
	for (name in context.packages) {
		pkg = context.packages[name];
		// packages are keyed by versioned and unversioned names
		if (!(pkg.name in seen) && pkg.metadata && pkg.metadata.rave) {
			seen[pkg.name] = true;
			extMeta = pkg.metadata.rave;
			// TODO: ensure that overridee is found
			if (extMeta.missing) {
				for (oname in extMeta.missing) {
					if (oname in context.packages) {
						console.log(render({ overrider: pkg.name, overridee: oname }, defaultedPackage));
					}
				}
			}
			if (extMeta.overrides) {
				for (oname in extMeta.overrides) {
					if (oname in context.packages) {
						console.log(render({ overrider: pkg.name, overridee: oname }, overriddenPackage));
					}
				}
			}
		}
	}
	return context;
}

});


;define('rave@0.4.3/lib/run/applyLoaderHooks', ['require', 'exports', 'module', 'rave@0.4.3/load/override'], function (require, exports, module, $cram_r0, define) {var override = $cram_r0;

module.exports = applyLoaderHooks;

function applyLoaderHooks (context, extensions) {
	return Promise.all(extensions).then(function (extensions) {
		return extensions.map(function (extension) {
			var api = extension.api;
			if (!api) return;
			if (api.load) {
				context.load.overrides = context.load.overrides.concat(api.load);
			}
		});
	}).then(function () {
		var hooks = override.hooks(context.load.nativeHooks, context.load.overrides);
		for (var name in hooks) {
			context.loader[name] = hooks[name];
		}
	}).then(function () {
		return extensions;
	});
}

});


;define('rave@0.4.3/lib/find/amdEvidence', ['require', 'exports', 'module', 'rave@0.4.3/lib/find/createCodeFinder'], function (require, exports, module, $cram_r0, define) {module.exports = findAmdEvidence;

var createCodeFinder = $cram_r0;

findAmdEvidence.rx = /(\bdefine\s*\()|(\bdefine\.amd\b)/g;

var finder = createCodeFinder(findAmdEvidence.rx);

function findAmdEvidence (source) {
	var isAmd = false;

	finder(source, function () {
		isAmd = true;
		return source.length; // stop searching
	});

	return { isAmd: isAmd };
}

});


;define('rave@0.4.3/lib/find/cjsEvidence', ['require', 'exports', 'module', 'rave@0.4.3/lib/find/createCodeFinder'], function (require, exports, module, $cram_r0, define) {module.exports = findCjsEvidence;

var createCodeFinder = $cram_r0;

findCjsEvidence.rx = /(\btypeof\s+exports\b|\bmodule\.exports\b|\bexports\.\b|\brequire\s*\(\s*["'][^"']*["']\s*\))/g;

var finder = createCodeFinder(findCjsEvidence.rx);

function findCjsEvidence (source) {
	var isCjs = false;

	finder(source, function () {
		isCjs = true;
		return source.length; // stop searching
	});

	return { isCjs: isCjs };
}

});


;define('rave@0.4.3/pipeline/instantiateScript', ['require', 'exports', 'module', 'rave@0.4.3/lib/metadata', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, $cram_r1, define) {module.exports = instantiateScript;

var metadata = $cram_r0;
var path = $cram_r1;

function instantiateScript (scriptFactory) {
	return function (load) {
		var packages, pkg, deps;

		// find dependencies
		packages = load.metadata.rave.packages;
		pkg = metadata.findPackage(packages, load.name);
		if (pkg && pkg.deps) {
			deps = pkgMains(packages, pkg.deps)
		}

		var factory = scriptFactory(this, load);
		return {
			deps: deps,
			execute: function () {
				factory();
				return new Module({});
			}
		};
	}
}


function pkgMains (packages, depPkgs) {
	var main, mains = [];
	for (var name in depPkgs) {
		// package-to-package dependency
		main = packages[depPkgs[name]].name;
		if (main) {
			mains.push(main);
		}
	}
	return mains;
}

});


;define('rave@0.4.3/lib/convert/npm', ['require', 'exports', 'module', 'rave@0.4.3/lib/convert/common', 'rave@0.4.3/lib/path', 'rave@0.4.3/pipeline/normalizeCjs'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var common = $cram_r0;
var path = $cram_r1;
var normalize = $cram_r2;

var transform = common.transform;
var createDeps = common.createDeps;

// main exports

exports.convert = npmConvert;

// exports for testing

exports.npmFixups = npmFixups;
exports.npmBrowserMap = npmBrowserMap;

function npmConvert (data) {
	return npmFixups(transform(data));
}

function npmFixups (data) {
	var metadata, main;
	metadata = data.metadata;
	main = (typeof metadata.browser === "string" && metadata.browser)
		|| data.main || 'index';
	data.main = path.removeExt(main);
	if (typeof metadata.browser === 'object') {
		data.mapFunc = npmBrowserMap(normalizeMap(metadata.browser, path.joinPaths(data.name, data.main)));
	}
	if (metadata.directories && metadata.directories.lib) {
		data.location = path.joinPaths(data.location, metadata.directories.lib);
	}
	return data;
}

function normalizeMap (map, refId) {
	var normalized = {}, path;
	for (path in map) {
		normalized[normalize(path, refId)] = map[path]
			? normalize(map[path], refId)
			: false;
	}
	return normalized;
}

function npmBrowserMap (normalized) {
	return function (name) {
		if (name in normalized) {
			return normalized[name] === false ? false : normalized[name];
		}
	};
}

});


;define('rave@0.4.3/lib/convert/bower', ['require', 'exports', 'module', 'rave@0.4.3/lib/convert/common', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, $cram_r1, define) {var common = $cram_r0;
var path = $cram_r1;

var transform = common.transform;
var createDeps = common.createDeps;

// main exports

exports.convert = bowerConvert;

// exports for testing

exports.bowerFixups = bowerFixups;

function bowerConvert (data) {
	return bowerFixups(transform(data));
}

function bowerFixups (data) {
	var metadata = data.metadata;
	if (metadata.moduleType) {
		data.moduleType = metadata.moduleType;
	}
	data.main = path.removeExt(bowerFindJsMain(data));
	return bowerAdjustLocation(data);
}

function bowerFindJsMain (data) {
	var mains, i;
	mains = data.main;
	if (mains && typeof mains === 'object') {
		for (i = 0; i < mains.length; i++) {
			if (mains[i].slice(-3) === '.js') return mains[i];
		}
	}
	return mains || data.name;
}

function bowerAdjustLocation (data) {
	var metadata, mainPath;
	metadata = data.metadata;
	if (metadata.directories && metadata.directories.lib) {
		data.location = metadata.directories.lib;
	}
	else {
		mainPath = path.splitDirAndFile(data.main);
		if (mainPath[0]) {
			data.location = path.joinPaths(data.location, mainPath[0]);
			data.main = mainPath[1];
		}
	}
	return data;
}

});


;define('rave@0.4.3/lib/amd/factory', ['require', 'exports', 'module', 'rave@0.4.3/lib/es5Transform', 'rave@0.4.3/lib/createRequire'], function (require, exports, module, $cram_r0, $cram_r1, define) {module.exports = amdFactory;

var es5Transform = $cram_r0;
var createRequire = $cram_r1;

function amdFactory (loader, defineArgs, load) {
	var cjsRequire, require, exports, module, scopedVars;

	cjsRequire = createRequire(loader, load.name);
	require = amdRequire;
	require.async = cjsRequire.async;
	require.named = cjsRequire.named;

	exports = {};
	module = {
		exports: exports,
		id: load.name,
		uri: load.address,
		config: function () {
			return load.metadata.rave;
		}
	};
	scopedVars = {
		require: require,
		module: module,
		exports: exports
	};

	return function () {
		var args, len, result;

		args = [];
		len = defineArgs.depsList ? defineArgs.depsList.length : 0;
		for (var i = 0; i < len; i++) {
			args.push(requireSync(defineArgs.depsList[i]));
		}

		result = defineArgs.factory.apply(null, args);

		// AMD factory result trumps all. if it's undefined, we
		// may be using CommonJS syntax.
		if (typeof result !== 'undefined' || !hasCjsExports(defineArgs)) {
			return es5Transform.toLoader(result); // a single default export
		}
		else {
			return exports === module.exports
				? exports // a set of named exports
				: es5Transform.toLoader(module.exports); // a single default export
		}
	};

	function amdRequire (id, callback, errback) {
		if (typeof id === 'string') {
			return requireSync(id);
		}
		else {
			return Promise.all(id.map(requireOne))
				.then(applyFactory, errback);
		}
		function applyFactory (modules) {
			return callback.apply(null, modules);
		}
	}

	function requireSync (id) {
		return id in scopedVars
			? scopedVars[id]
			: cjsRequire(id);
	}

	function requireOne (id) {
		return id in scopedVars
			? scopedVars[id]
			: cjsRequire.async(id);
	}
}

function hasCjsExports (def) {
	return def.depsList
		? hasCommonJSDep(def.depsList)
		: def.factory.length > 1;
}

function hasCommonJSDep (deps) {
	// check if module requires `module` or `exports`
	for (var i = deps.length - 1; i >= 0; i--) {
		if (deps[i] === 'exports' || deps[i] === 'module') return true;
	}
	return false;
}

});


;define('rave@0.4.3/lib/createVersionedIdTransform', ['require', 'exports', 'module', 'rave@0.4.3/lib/uid', 'rave@0.4.3/lib/metadata', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var createUid = $cram_r0.create;
var metadata = $cram_r1;
var path = $cram_r2;

module.exports = createVersionedIdTransform;

function createVersionedIdTransform (context) {
	var packages;

	packages = context.packages;

	return function (normalized, refUid, refUrl) {
		var refPkg, depPkg;

		refPkg = metadata.findPackage(packages, refUid);
		depPkg = metadata.findDepPackage(packages, refPkg, normalized);

		if (!depPkg) {
			depPkg = metadata.findPackage(packages, normalized);
		}

		if (!depPkg) {
			throw new Error('Package not found for ' + normalized);
		}

		// translate package main (e.g. "rest" --> "rest/rest")
		if (normalized === depPkg.name && depPkg.main) {
			normalized = depPkg.main.charAt(0) === '.'
				? path.reduceLeadingDots(depPkg.main, path.ensureEndSlash(depPkg.name))
				: path.joinPaths(depPkg.name, depPkg.main);
		}

		if (normalized.indexOf('#') < 0) {
			// it's not already an uid
			normalized = createUid(depPkg, normalized);
		}

		return normalized;
	};
}

});


;define('rave@0.4.3/pipeline/locatePackage', ['require', 'exports', 'module', 'rave@0.4.3/lib/path', 'rave@0.4.3/lib/uid', 'rave@0.4.3/lib/metadata'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {module.exports = locatePackage;

var path = $cram_r0;
var parseUid = $cram_r1.parse;
var metadata = $cram_r2;

function locatePackage (load) {
	var options, parts, packageName, modulePath, moduleName, descriptor,
		location;

	options = load.metadata.rave;

	if (!options.packages) throw new Error('Packages not provided: ' + load.name);

	parts = parseUid(load.name);
	packageName = parts.pkgUid || parts.pkgName;
	modulePath = parts.modulePath;

	descriptor = options.packages[packageName];
	if (!descriptor) throw new Error('Package not found: ' + load.name);

	moduleName = modulePath || descriptor.main;
	if (!load.metadata.dontAddExt) {
		moduleName = path.ensureExt(moduleName, '.js')
	}

	location = descriptor.location;
	if (!path.isAbsUrl(location) && options.baseUrl) {
		// prepend baseUrl
		location = path.joinPaths(options.baseUrl, location);
	}

	return path.joinPaths(location, moduleName);
}

});


;define('rave@0.4.3/lib/find/es5ModuleTypes', ['require', 'exports', 'module', 'rave@0.4.3/lib/find/createCodeFinder', 'rave@0.4.3/lib/find/amdEvidence', 'rave@0.4.3/lib/find/cjsEvidence'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {module.exports = findEs5ModuleTypes;

var createCodeFinder = $cram_r0;
var findAmdEvidence = $cram_r1;
var findCjsEvidence = $cram_r2;

findEs5ModuleTypes.rx = createCodeFinder.composeRx(
	findAmdEvidence.rx, findCjsEvidence.rx, 'g'
);

var finder = createCodeFinder(findEs5ModuleTypes.rx);

function findEs5ModuleTypes (source, preferAmd) {
	var results, foundDefine;

	results = { isCjs: false, isAmd: false };

	finder(source, function (matches) {
		var amdDefine = matches[1], amdDetect = matches[2], cjs = matches[3];
		if (cjs) {
			// only flag as CommonJS if we haven't hit a define
			// this prevents CommonJS-wrapped AMD from being flagged as cjs
			if (!foundDefine) results.isCjs = true;
		}
		else if (amdDefine || amdDetect) {
			results.isAmd = true;
			foundDefine = amdDefine;
			// optimization: stop searching if we found AMD evidence
			if (preferAmd) return source.length;
		}
	});

	return results;
}


});


;define('rave@0.4.3/lib/createMapper', ['require', 'exports', 'module', 'rave@0.4.3/lib/metadata', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, $cram_r1, define) {var metadata = $cram_r0;
var path = $cram_r1;

module.exports = createMapper;

function createMapper (context) {
	var packages;

	packages = context.packages;

	return function (normalizedName, refUid) {
		var refPkg, mappedId;

		refPkg = metadata.findPackage(packages, refUid);

		if (refPkg.mapFunc) {
			mappedId = refPkg.mapFunc(normalizedName);
		}
		else if (refPkg.map) {
			if (normalizedName in refPkg.map) {
				mappedId = refPkg.map[normalizedName];
			}
		}

		// mappedId can be undefined, false, or a string
		// undefined === no mapping, return original id
		// false === do not load a module by this id, use blank module
		// string === module id was mapped, return mapped id
		return typeof mappedId === 'undefined'
			? normalizedName
			: mappedId === false
				? 'rave/lib/blank'
				: mappedId;
	};
}

});


;define('rave@0.4.3/lib/crawl', ['require', 'exports', 'module', 'rave@0.4.3/lib/crawl/npm', 'rave@0.4.3/lib/convert/npm', 'rave@0.4.3/lib/crawl/bower', 'rave@0.4.3/lib/convert/bower', 'rave@0.4.3/lib/path'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, define) {var npmCrawl = $cram_r0.crawl;
var npmConvert = $cram_r1.convert;
var bowerCrawl = $cram_r2.crawl;
var bowerConvert = $cram_r3.convert;
var path = $cram_r4;

module.exports = crawl;

var fileTypeInfo = {
	'bower.json': {
		crawl: bowerCrawl,
		convert: bowerConvert
	},
	'package.json': {
		crawl: npmCrawl,
		convert: npmConvert
	}
};

function crawl (rootUrls) {
	if (typeof rootUrls === 'string') {
		rootUrls = rootUrls.split(/\s*,\s*/);
	}
	return Promise.all(rootUrls.map(crawlOne))
		.then(collapseMetadata);
}

function crawlOne (rootUrl) {
	var fileParts, info;

	fileParts = path.splitDirAndFile(rootUrl);
	info = fileTypeInfo[fileParts[1]];

	return info
		? info.crawl(info.convert, fileParts[0])['catch'](logError)
		: Promise.reject(new Error('Unknown metadata file: ' + rootUrl));
}

function collapseMetadata (tuples) {
	return tuples.reduce(function (result, tuple) {
		if (!tuple || !tuple.root) return result;
		result.roots.push(tuple.root);
		tuple.all.reduce(function (packages, data) {
			packages[data.name] = packages[data.uid] = data;
			return packages;
		}, result.packages);
		return result;
	}, { roots: [], packages: {} });
}

function logError (ex) {
	console.error(ex);
}

});


;define('rave@0.4.3/lib/debug/moduleType', ['require', 'exports', 'module', 'rave@0.4.3/lib/metadata', 'rave@0.4.3/lib/find/es5ModuleTypes'], function (require, exports, module, $cram_r0, $cram_r1, define) {var metadata = $cram_r0;
var findEs5ModuleTypes = $cram_r1;

module.exports = moduleType;

function moduleType (load) {
	var pkg, type;

	pkg = metadata.findPackage(load.metadata.rave.packages, load.name);
	type = metadata.moduleType(pkg);

	if (type) {
		return type;
	}
	else {
		pkg.moduleType = guessModuleType(load) || ['globals']; // fix package
		return metadata.moduleType(pkg); // try again :)
	}
}

function guessModuleType (load) {
	try {
		var evidence = findEs5ModuleTypes(load.source, true);
		return evidence.isAmd && ['amd']
			|| evidence.isCjs && ['node'];
	}
	catch (ex) {
		ex.message += ' ' + load.name + ' ' + load.address;
		throw ex;
	}
}

});


;define('rave@0.4.3/lib/createPackageMapper', ['require', 'exports', 'module', 'rave@0.4.3/lib/createMapper', 'rave@0.4.3/lib/uid'], function (require, exports, module, $cram_r0, $cram_r1, define) {var createMapper = $cram_r0;
var uid = $cram_r1;

module.exports = createPackageMapper;

function createPackageMapper (context) {
	var mapper = createMapper(context);
	return function (normalizedName, refUid, refUrl) {
		return mapper(uid.getName(normalizedName), refUid, refUrl);
	};
}

});


;define('rave@0.4.3/auto', ['require', 'exports', 'module', 'rave@0.4.3/lib/crawl', 'rave@0.4.3/lib/auto/assembleAppContext'], function (require, exports, module, $cram_r0, $cram_r1, define) {var crawl = $cram_r0;
var assembleAppContext = $cram_r1;

module.exports = autoConfigure;

var defaultMeta = 'bower.json,package.json';

function autoConfigure (context) {
	if (!context.raveMeta) context.raveMeta = defaultMeta;

	context.packages = {};

	return crawl(context.raveMeta)
		.then(failIfNone)
		.then(done);

	function done (allMetadata) {
		context.packages = allMetadata.packages;
		context.metadata = allMetadata.roots;
		context = assembleAppContext(context);
		return context;
	}
}

function failIfNone (allMetadata) {
	if (allMetadata.roots.length === 0) {
		throw new Error('No metadata files found: ' + context.raveMeta);
	}
	return allMetadata;
}

});


;define('rave@0.4.3/lib/amd/bundle', ['require', 'exports', 'module', 'rave@0.4.3/lib/metadata', 'rave@0.4.3/lib/uid', 'rave@0.4.3/lib/amd/factory'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var metadata = $cram_r0;
var createUid = $cram_r1.create;
var amdFactory = $cram_r2;

exports.process = process;

// TODO: replace this sync algorithm with one that is based on register()
// if (defines.named.length <= 1) process as before
// else loop through defines and eval all modules sync,
//   returning the one whose name matches load.name

// TODO: register-based algorithm
//if (defines.anon) register(defines.anon, load.name);
//defines.named.forEach(function (def) {
// register(def);
//});

function process (load, defines) {
	var mainDefine, i;

	for (i = 0; i < defines.length; i++) {
		mainDefine = processOne(load, defines[i]) || mainDefine;
	}

	return mainDefine;

}

function processOne (load, define) {
	var loader, packages, name, uid, defLoad, value;

	loader = load.metadata.rave.loader;
	packages = load.metadata.rave.packages;
	name = define.name;
	uid = getUid(packages, name);

	if (uid === load.name) {
		return define;
	}
	else {
		defLoad = Object.create(load);
		defLoad.name = uid;
		defLoad.address = load.address + '#' + encodeURIComponent(name);
		value = amdFactory(loader, define, defLoad)();
		loader.set(uid, new Module(value));
	}
}

function getUid (packages, name) {
	var pkg = metadata.findPackage(packages, name);
	return createUid(pkg, name);
}

});


;define('rave@0.4.3/lib/debug/instantiateJS', ['require', 'exports', 'module', 'rave@0.4.3/lib/debug/moduleType'], function (require, exports, module, $cram_r0, define) {var moduleType = $cram_r0;

module.exports = instantiateJs;

function instantiateJs (instantiator) {
	return function (load) {
		var instantiate = instantiator(moduleType(load));
		if (!instantiate) {
			throw new Error('No instantiator found for ' + load.name);
		}
		return instantiate(load);
	};
}

});


;define('rave@0.4.3/lib/hooksFromMetadata', ['require', 'exports', 'module', 'rave@0.4.3/lib/uid', 'rave@0.4.3/lib/createNormalizer', 'rave@0.4.3/lib/createVersionedIdTransform', 'rave@0.4.3/lib/createPackageMapper', 'rave@0.4.3/pipeline/locatePackage'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, define) {var parseUid = $cram_r0.parse;
var createNormalizer = $cram_r1;
var createVersionedIdTransform = $cram_r2;
var createPackageMapper = $cram_r3;
var locatePackage = $cram_r4;

module.exports = hooksFromMetadata;

function hooksFromMetadata (hooks, context) {
	var metadataOverride;

	metadataOverride = {
		predicate: createIsConfigured(context),
		hooks: {
			normalize: createNormalizer(
				createVersionedIdTransform(context),
				createPackageMapper(context),
				hooks.normalize
			),
			locate: withContext(context, locatePackage), // hooks.locate not used
			fetch: hooks.fetch,
			translate: hooks.translate,
			instantiate: hooks.instantiate
		}
	};

	return [metadataOverride];
}

function createIsConfigured (context) {
	var packages = context.packages;
	return function isConfigured (arg) {
		return parseUid(arg.name).pkgUid in packages;
	};
}

function withContext (context, func) {
	return function (load) {
		load.metadata.rave = context;
		return func.call(this, load);
	};
}

});


;define('rave@0.4.3/pipeline/instantiateAmd', ['require', 'exports', 'module', 'rave@0.4.3/lib/find/requires', 'rave@0.4.3/lib/amd/captureDefines', 'rave@0.4.3/lib/amd/factory', 'rave@0.4.3/lib/amd/bundle'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, define) {var findRequires = $cram_r0;
var captureDefines = $cram_r1;
var amdFactory = $cram_r2;
var processBundle = $cram_r3.process;

module.exports = instantiateAmd;

var scopedVars = ['require', 'exports', 'module'];

function instantiateAmd (captureDefines) {
	return function (load) {
		var loader, defines, mainDefine, arity, factory, deps, i;

		loader = load.metadata.rave.loader;

		// the surest way to capture the many define() variations is to run it
		defines = captureDefines(load);

		if (defines.named.length <= 1) {
			mainDefine = defines.anon || defines.named.pop()
		}
		else {
			mainDefine = processBundle(load, defines.named);
		}

		arity = mainDefine.factory.length;

		// copy deps so we can remove items below!
		deps = mainDefine.depsList ? mainDefine.depsList.slice() : [];

		if (mainDefine.depsList == null && arity > 0) {
			mainDefine.requires = findOrThrow(load, mainDefine.factory.toString());
			mainDefine.depsList = scopedVars.slice(0, arity);
			deps = deps.concat(mainDefine.requires);
		}

		factory = amdFactory(loader, mainDefine, load);

		// remove "require", "exports", "module" from loader deps
		for (i = deps.length - 1; i >= 0; i--) {
			if (scopedVars.indexOf(deps[i]) >= 0) {
				deps.splice(i, 1);
			}
		}

		return {
			deps: deps,
			execute: function () {
				return new Module(factory.apply(loader, arguments));
			}
		};
	}
}

function findOrThrow (load, source) {
	try {
		return findRequires(source);
	}
	catch (ex) {
		ex.message += ' ' + load.name + ' ' + load.address;
		throw ex;
	}
}

});


;define('rave@0.4.3/lib/run/configureLoader', ['require', 'exports', 'module', 'rave@0.4.3/lib/hooksFromMetadata', 'rave@0.4.3/load/override'], function (require, exports, module, $cram_r0, $cram_r1, define) {var fromMetadata = $cram_r0;
var override = $cram_r1;

module.exports = configureLoader;

function configureLoader (baseHooks) {
	return function (context) {
		var overrides = fromMetadata(baseHooks, context);
		context.load.overrides = overrides;
		var hooks = override.hooks(context.load.nativeHooks, overrides);
		for (var name in hooks) {
			context.loader[name] = hooks[name];
		}
		return Promise.resolve(context);
	};
}

});


;define('rave@0.4.3/lib/debug/instantiators', ['require', 'exports', 'module', 'rave@0.4.3/pipeline/instantiateNode', 'rave@0.4.3/lib/debug/nodeFactory', 'rave@0.4.3/lib/debug/nodeEval', 'rave@0.4.3/pipeline/instantiateAmd', 'rave@0.4.3/lib/debug/captureDefines', 'rave@0.4.3/lib/debug/amdEval', 'rave@0.4.3/pipeline/instantiateScript', 'rave@0.4.3/lib/debug/scriptFactory', 'rave@0.4.3/lib/debug/scriptEval'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, $cram_r5, $cram_r6, $cram_r7, $cram_r8, define) {var instantiateNode = $cram_r0;
var nodeFactory = $cram_r1;
var nodeEval = $cram_r2;
var instantiateAmd = $cram_r3;
var captureDefines = $cram_r4;
var amdEval = $cram_r5;
var instantiateScript = $cram_r6;
var scriptFactory = $cram_r7;
var scriptEval = $cram_r8;

exports.amd = instantiateAmd(captureDefines(amdEval));
exports.node = instantiateNode(nodeFactory(nodeEval));
exports.globals = instantiateScript(scriptFactory(scriptEval));


});


;define('rave@0.4.3/lib/run', ['require', 'exports', 'module', 'rave@0.4.3/pipeline/normalizeCjs', 'rave@0.4.3/pipeline/locateAsIs', 'rave@0.4.3/pipeline/fetchAsText', 'rave@0.4.3/pipeline/translateAsIs', 'rave@0.4.3/lib/debug/instantiateJS', 'rave@0.4.3/lib/debug/instantiators', 'rave@0.4.3/lib/run/applyLoaderHooks', 'rave@0.4.3/lib/run/configureLoader', 'rave@0.4.3/lib/run/gatherExtensions', 'rave@0.4.3/lib/run/applyFirstMain', 'rave@0.4.3/lib/run/initApplication'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, $cram_r5, $cram_r6, $cram_r7, $cram_r8, $cram_r9, $cram_r10, define) {var normalizeCjs = $cram_r0;
var locateAsIs = $cram_r1;
var fetchAsText = $cram_r2;
var translateAsIs = $cram_r3;
var instantiateJs = $cram_r4;
var instantiators = $cram_r5;
var applyLoaderHooks = $cram_r6;
var configureLoader = $cram_r7;
var gatherExtensions = $cram_r8;
var applyFirstMain = $cram_r9;
var initApplication = $cram_r10;

module.exports = {
	main: main,
	applyLoaderHooks: applyLoaderHooks
};

var defaultMeta = 'bower.json,package.json';

function main (context) {
	var applyLoaderHooks;
	var baseHooks = {
		normalize: normalizeCjs,
		locate: locateAsIs,
		fetch: fetchAsText,
		translate: translateAsIs,
		instantiate: instantiateJs(getInstantiator)
	};

	applyLoaderHooks = this.applyLoaderHooks;

	return done(context)
		['catch'](failHard);

	function done (context) {

		return configureLoader(baseHooks)(context)
			.then(evalPredefines)
			.then(gatherExtensions)
			.then(function (extensions) {
				return applyLoaderHooks(context, extensions);
			})
			.then(function (extensions) {
				return applyFirstMain(context, extensions);
			})
			.then(function (alreadyRanMain) {
				return !alreadyRanMain && initApplication(context);
			});
	}
}

function getInstantiator (moduleType) {
	return instantiators[moduleType];
}

function failHard (ex) {
	setTimeout(function () { throw ex; }, 0);
}

function evalPredefines (context) {
	return context.evalPredefines
		? context.evalPredefines(context)
		: context;
}

});


;define('rave@0.4.3/start', ['require', 'exports', 'module', 'rave@0.4.3/auto', 'rave@0.4.3/lib/run', 'rave@0.4.3/debug'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var autoConfigure = $cram_r0;
var run = $cram_r1;
var debug = $cram_r2;

exports.main = function (context) {
	debug.start(context);
	// Temporary way to not autoConfigure if it has been done already (e.g. in a build)
	return Promise.resolve(context.packages ? context : autoConfigure(context))
		.then(
			function (context) {
				debug.assertNoConflicts(context);
				return context;
			},
			function (ex) {
				debug.assertNoConflicts(context);
				throw ex;
			}
		)
		.then(debug.logOverrides)
		.then(
			function (context) {
				return run.main(context);
			}
		);
};

var applyLoaderHooks = run.applyLoaderHooks;

run.applyLoaderHooks = function (context, extensions) {
	debug.assertRavePackage(context);
	return applyLoaderHooks.call(this, context, extensions)
		.then(function (result) {
			debug.installDebugHooks(context);
			return result;
		});
};

});



// eval any bundled context (e.g. from a rave build)
define = exports.contextDefine(context);



// pass forward any predefined modules (e.g. from a rave build)
context.evalPredefines = exports.evalPredefines(bundle);

// go!
exports.boot(context);

}(function (define) {



}.bind(this)));
