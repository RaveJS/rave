!function(e){"object"==typeof exports?module.exports=e():"function"==typeof define&&define.amd?define(e):"undefined"!=typeof window?window.Promise=e():"undefined"!=typeof global?global.Promise=e():"undefined"!=typeof self&&(self.Promise=e())}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

/**
 * ES6 global Promise shim
 */
var unhandledRejections = require('../lib/decorators/unhandledRejection');
var PromiseConstructor = module.exports = unhandledRejections(require('../lib/Promise'));

var g = typeof global !== 'undefined' && global
	|| typeof self !== 'undefined' && self;

if(typeof g !== 'undefined' && typeof g.Promise === 'undefined') {
	g['Promise'] = PromiseConstructor;
}

},{"../lib/Promise":2,"../lib/decorators/unhandledRejection":5}],2:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function (require) {

	var makePromise = require('./makePromise');
	var Scheduler = require('./scheduler');
	var async = require('./async');

	return makePromise({
		scheduler: new Scheduler(async)
	});

});
})(typeof define === 'function' && define.amd ? define : function (factory) { module.exports = factory(require); });

},{"./async":4,"./makePromise":6,"./scheduler":7}],3:[function(require,module,exports){
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
			try {
				// vert.x 1.x || 2.x
				return cjsRequire('vertx').runOnLoop || cjsRequire('vertx').runOnContext;
			} catch (ignore) {}

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

},{}],5:[function(require,module,exports){
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

},{"../timer":8}],6:[function(require,module,exports){
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
		 * @returns {makePromise.DeferredHandler}
		 */
		function init(resolver) {
			var handler = new DeferredHandler();

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

		/**
		 * Returns a trusted promise. If x is already a trusted promise, it is
		 * returned, otherwise returns a new trusted Promise which follows x.
		 * @param  {*} x
		 * @return {Promise} promise
		 */
		function resolve(x) {
			return isPromise(x) ? x
				: new Promise(Handler, new AsyncHandler(getHandler(x)));
		}

		/**
		 * Return a reject promise with x as its reason (x is used verbatim)
		 * @param {*} x
		 * @returns {Promise} rejected promise
		 */
		function reject(x) {
			return new Promise(Handler, new AsyncHandler(new RejectedHandler(x)));
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
			return new Promise(Handler, new DeferredHandler());
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

			if (typeof onFulfilled !== 'function' && parent.join().state() > 0) {
				// Short circuit: value will not change, simply share handler
				return new Promise(Handler, parent);
			}

			var p = this._beget();
			var child = p._handler;

			parent.when({
				resolve: child.resolve,
				notify: child.notify,
				context: child,
				receiver: parent.receiver,
				fulfilled: onFulfilled,
				rejected: onRejected,
				progress: arguments.length > 2 ? arguments[2] : void 0
			});

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
		 * Private function to bind a thisArg for this promise's handlers
		 * @private
		 * @param {object} thisArg `this` value for all handlers attached to
		 *  the returned promise.
		 * @returns {Promise}
		 */
		Promise.prototype._bindContext = function(thisArg) {
			return new Promise(Handler, new BoundHandler(this._handler, thisArg));
		};

		/**
		 * Creates a new, pending promise of the same type as this promise
		 * @private
		 * @returns {Promise}
		 */
		Promise.prototype._beget = function() {
			var parent = this._handler;
			var child = new DeferredHandler(parent.receiver, parent.join().context);
			return new this.constructor(Handler, child);
		};

		/**
		 * Check if x is a rejected promise, and if so, delegate to handler._fatal
		 * @private
		 * @param {*} x
		 */
		Promise.prototype._maybeFatal = function(x) {
			if(!maybeThenable(x)) {
				return;
			}

			var handler = getHandler(x);
			var context = this._handler.context;
			handler.catchError(function() {
				this._fatal(context);
			}, handler);
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
			var resolver = new DeferredHandler();
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
					h = isPromise(x)
						? x._handler.join()
						: getHandlerUntrusted(x);

					s = h.state();
					if (s === 0) {
						resolveOne(resolver, results, h, i);
					} else if (s > 0) {
						results[i] = h.value;
						--pending;
					} else {
						resolver.become(h);
						break;
					}

				} else {
					results[i] = x;
					--pending;
				}
			}

			if(pending === 0) {
				resolver.become(new FulfilledHandler(results));
			}

			return new Promise(Handler, resolver);
			function resolveOne(resolver, results, handler, i) {
				handler.map(function(x) {
					results[i] = x;
					if(--pending === 0) {
						this.become(new FulfilledHandler(results));
					}
				}, resolver);
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

			var h = new DeferredHandler();
			var i, x;
			for(i=0; i<promises.length; ++i) {
				x = promises[i];
				if (x !== void 0 && i in promises) {
					getHandler(x).chain(h, h.resolve, h.reject);
				}
			}
			return new Promise(Handler, h);
		}

		// Promise internals

		/**
		 * Get an appropriate handler for x, without checking for cycles
		 * @private
		 * @param {*} x
		 * @returns {object} handler
		 */
		function getHandler(x) {
			if(isPromise(x)) {
				return x._handler.join();
			}
			return maybeThenable(x) ? getHandlerUntrusted(x) : new FulfilledHandler(x);
		}

		function isPromise(x) {
			return x instanceof Promise;
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
					? new ThenableHandler(untrustedThen, x)
					: new FulfilledHandler(x);
			} catch(e) {
				return new RejectedHandler(e);
			}
		}

		/**
		 * Handler for a promise that is pending forever
		 * @private
		 * @constructor
		 */
		function Handler() {}

		Handler.prototype.when
			= Handler.prototype.resolve
			= Handler.prototype.reject
			= Handler.prototype.notify
			= Handler.prototype._fatal
			= Handler.prototype._unreport
			= Handler.prototype._report
			= noop;

		Handler.prototype.inspect = toPendingState;

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

		Handler.prototype.chain = function(to, fulfilled, rejected, progress) {
			this.when({
				resolve: noop,
				notify: noop,
				context: void 0,
				receiver: to,
				fulfilled: fulfilled,
				rejected: rejected,
				progress: progress
			});
		};

		Handler.prototype.map = function(f, to) {
			this.chain(to, f, to.reject, to.notify);
		};

		Handler.prototype.catchError = function(f, to) {
			this.chain(to, to.resolve, f, to.notify);
		};

		Handler.prototype.fold = function(to, f, z) {
			this.join().map(function(x) {
				getHandler(z).map(function(z) {
					this.resolve(tryCatchReject2(f, z, x, this.receiver));
				}, this);
			}, to);
		};

		/**
		 * Handler that manages a queue of consumers waiting on a pending promise
		 * @private
		 * @constructor
		 */
		function DeferredHandler(receiver, inheritedContext) {
			Promise.createContext(this, inheritedContext);

			this.consumers = void 0;
			this.receiver = receiver;
			this.handler = void 0;
			this.resolved = false;
		}

		inherit(Handler, DeferredHandler);

		DeferredHandler.prototype._state = 0;

		DeferredHandler.prototype.inspect = function() {
			return this.resolved ? this.join().inspect() : toPendingState();
		};

		DeferredHandler.prototype.resolve = function(x) {
			if(!this.resolved) {
				this.become(getHandler(x));
			}
		};

		DeferredHandler.prototype.reject = function(x) {
			if(!this.resolved) {
				this.become(new RejectedHandler(x));
			}
		};

		DeferredHandler.prototype.join = function() {
			if (this.resolved) {
				var h = this;
				while(h.handler !== void 0) {
					h = h.handler;
					if(h === this) {
						return this.handler = new Cycle();
					}
				}
				return h;
			} else {
				return this;
			}
		};

		DeferredHandler.prototype.run = function() {
			var q = this.consumers;
			var handler = this.join();
			this.consumers = void 0;

			for (var i = 0; i < q.length; ++i) {
				handler.when(q[i]);
			}
		};

		DeferredHandler.prototype.become = function(handler) {
			this.resolved = true;
			this.handler = handler;
			if(this.consumers !== void 0) {
				tasks.enqueue(this);
			}

			if(this.context !== void 0) {
				handler._report(this.context);
			}
		};

		DeferredHandler.prototype.when = function(continuation) {
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

		DeferredHandler.prototype.notify = function(x) {
			if(!this.resolved) {
				tasks.enqueue(new ProgressTask(this, x));
			}
		};

		DeferredHandler.prototype._report = function(context) {
			this.resolved && this.handler.join()._report(context);
		};

		DeferredHandler.prototype._unreport = function() {
			this.resolved && this.handler.join()._unreport();
		};

		DeferredHandler.prototype._fatal = function(context) {
			var c = typeof context === 'undefined' ? this.context : context;
			this.resolved && this.handler.join()._fatal(c);
		};

		/**
		 * Abstract base for handler that delegates to another handler
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function DelegateHandler(handler) {
			this.handler = handler;
		}

		inherit(Handler, DelegateHandler);

		DelegateHandler.prototype.inspect = function() {
			return this.join().inspect();
		};

		DelegateHandler.prototype._report = function(context) {
			this.join()._report(context);
		};

		DelegateHandler.prototype._unreport = function() {
			this.join()._unreport();
		};

		/**
		 * Wrap another handler and force it into a future stack
		 * @private
		 * @param {object} handler
		 * @constructor
		 */
		function AsyncHandler(handler) {
			DelegateHandler.call(this, handler);
		}

		inherit(DelegateHandler, AsyncHandler);

		AsyncHandler.prototype.when = function(continuation) {
			tasks.enqueue(new ContinuationTask(continuation, this.join()));
		};

		/**
		 * Handler that follows another handler, injecting a receiver
		 * @private
		 * @param {object} handler another handler to follow
		 * @param {object=undefined} receiver
		 * @constructor
		 */
		function BoundHandler(handler, receiver) {
			DelegateHandler.call(this, handler);
			this.receiver = receiver;
		}

		inherit(DelegateHandler, BoundHandler);

		BoundHandler.prototype.when = function(continuation) {
			// Because handlers are allowed to be shared among promises,
			// each of which possibly having a different receiver, we have
			// to insert our own receiver into the chain if it has been set
			// so that callbacks (f, r, u) will be called using our receiver
			if(this.receiver !== void 0) {
				continuation.receiver = this.receiver;
			}
			this.join().when(continuation);
		};

		/**
		 * Handler that wraps an untrusted thenable and assimilates it in a future stack
		 * @private
		 * @param {function} then
		 * @param {{then: function}} thenable
		 * @constructor
		 */
		function ThenableHandler(then, thenable) {
			DeferredHandler.call(this);
			tasks.enqueue(new AssimilateTask(then, thenable, this));
		}

		inherit(DeferredHandler, ThenableHandler);

		/**
		 * Handler for a fulfilled promise
		 * @private
		 * @param {*} x fulfillment value
		 * @constructor
		 */
		function FulfilledHandler(x) {
			Promise.createContext(this);
			this.value = x;
		}

		inherit(Handler, FulfilledHandler);

		FulfilledHandler.prototype._state = 1;

		FulfilledHandler.prototype.inspect = function() {
			return { state: 'fulfilled', value: this.value };
		};

		FulfilledHandler.prototype.when = function(cont) {
			var x;

			if (typeof cont.fulfilled === 'function') {
				Promise.enterContext(this);
				x = tryCatchReject(cont.fulfilled, this.value, cont.receiver);
				Promise.exitContext();
			} else {
				x = this.value;
			}

			cont.resolve.call(cont.context, x);
		};

		var id = 0;
		/**
		 * Handler for a rejected promise
		 * @private
		 * @param {*} x rejection reason
		 * @constructor
		 */
		function RejectedHandler(x) {
			Promise.createContext(this);

			this.id = ++id;
			this.value = x;
			this.handled = false;
			this.reported = false;

			this._report();
		}

		inherit(Handler, RejectedHandler);

		RejectedHandler.prototype._state = -1;

		RejectedHandler.prototype.inspect = function() {
			return { state: 'rejected', reason: this.value };
		};

		RejectedHandler.prototype.when = function(cont) {
			var x;

			if (typeof cont.rejected === 'function') {
				this._unreport();
				Promise.enterContext(this);
				x = tryCatchReject(cont.rejected, this.value, cont.receiver);
				Promise.exitContext();
			} else {
				x = new Promise(Handler, this);
			}


			cont.resolve.call(cont.context, x);
		};

		RejectedHandler.prototype._report = function(context) {
			tasks.afterQueue(reportUnhandled, this, context);
		};

		RejectedHandler.prototype._unreport = function() {
			this.handled = true;
			tasks.afterQueue(reportHandled, this);
		};

		RejectedHandler.prototype._fatal = function(context) {
			Promise.onFatalRejection(this, context);
		};

		function reportUnhandled(rejection, context) {
			if(!rejection.handled) {
				rejection.reported = true;
				Promise.onPotentiallyUnhandledRejection(rejection, context);
			}
		}

		function reportHandled(rejection) {
			if(rejection.reported) {
				Promise.onPotentiallyUnhandledRejectionHandled(rejection);
			}
		}

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

		function Cycle() {
			RejectedHandler.call(this, new TypeError('Promise cycle'));
		}

		inherit(RejectedHandler, Cycle);

		// Snapshot states

		/**
		 * Creates a pending state snapshot
		 * @private
		 * @returns {{state:'pending'}}
		 */
		function toPendingState() {
			return { state: 'pending' };
		}

		// Task runners

		/**
		 * Run a single consumer
		 * @private
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
		 * @private
		 * @constructor
		 */
		function ProgressTask(handler, value) {
			this.handler = handler;
			this.value = value;
		}

		ProgressTask.prototype.run = function() {
			var q = this.handler.consumers;
			if(q === void 0) {
				return;
			}
			// First progress handler is at index 1
			for (var i = 0; i < q.length; ++i) {
				this._notify(q[i]);
			}
		};

		ProgressTask.prototype._notify = function(continuation) {
			var x = typeof continuation.progress === 'function'
				? tryCatchReturn(continuation.progress, this.value, continuation.receiver)
				: this.value;

			continuation.notify.call(continuation.context, x);
		};

		/**
		 * Assimilate a thenable, sending it's value to resolver
		 * @private
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
		 * @returns {boolean} false iff x is guaranteed not to be a thenable
		 */
		function maybeThenable(x) {
			return (typeof x === 'object' || typeof x === 'function') && x !== null;
		}

		/**
		 * Return f.call(thisArg, x), or if it throws return a rejected promise for
		 * the thrown exception
		 * @private
		 */
		function tryCatchReject(f, x, thisArg) {
			try {
				return f.call(thisArg, x);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Same as above, but includes the extra argument parameter.
		 * @private
		 */
		function tryCatchReject2(f, x, y, thisArg) {
			try {
				return f.call(thisArg, x, y);
			} catch(e) {
				return reject(e);
			}
		}

		/**
		 * Return f.call(thisArg, x), or if it throws, *return* the exception
		 * @private
		 */
		function tryCatchReturn(f, x, thisArg) {
			try {
				return f.call(thisArg, x);
			} catch(e) {
				return e;
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

},{}],7:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {

	var Queue = require('./Queue');

	// Credit to Twisol (https://github.com/Twisol) for suggesting
	// this type of extensible queue + trampoline approach for next-tick conflation.

	function Scheduler(enqueue) {
		this._enqueue = enqueue;
		this._handlerQueue = new Queue(15);
		this._afterQueue = new Queue(5);
		this._running = false;

		var self = this;
		this.drain = function() {
			self._drain();
		};
	}

	/**
	 * Enqueue a task. If the queue is not currently scheduled to be
	 * drained, schedule it.
	 * @param {function} task
	 */
	Scheduler.prototype.enqueue = function(task) {
		this._handlerQueue.push(task);
		if(!this._running) {
			this._running = true;
			this._enqueue(this.drain);
		}
	};

	Scheduler.prototype.afterQueue = function(f, x, y) {
		this._afterQueue.push(f);
		this._afterQueue.push(x);
		this._afterQueue.push(y);
		if(!this._running) {
			this._running = true;
			this._enqueue(this.drain);
		}
	};

	/**
	 * Drain the handler queue entirely, being careful to allow the
	 * queue to be extended while it is being processed, and to continue
	 * processing until it is truly empty.
	 */
	Scheduler.prototype._drain = function() {
		var q = this._handlerQueue;
		while(q.length > 0) {
			q.shift().run();
		}

		this._running = false;

		q = this._afterQueue;
		while(q.length > 0) {
			q.shift()(q.shift(), q.shift());
		}
	};

	return Scheduler;

});
}(typeof define === 'function' && define.amd ? define : function(factory) { module.exports = factory(require); }));

},{"./Queue":3}],8:[function(require,module,exports){
/** @license MIT License (c) copyright 2010-2014 original author or authors */
/** @author Brian Cavalier */
/** @author John Hann */

(function(define) { 'use strict';
define(function(require) {
	/*global setTimeout,clearTimeout*/
	var cjsRequire, vertx, setTimer, clearTimer;

	cjsRequire = require;

	try {
		vertx = cjsRequire('vertx');
		setTimer = function (f, ms) { return vertx.setTimer(ms, f); };
		clearTimer = vertx.cancelTimer;
	} catch (e) {
		setTimer = function(f, ms) { return setTimeout(f, ms); };
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
*********************************************************************************************

  Loader Polyfill

    - Implemented exactly to the 2014-05-22 Specification Draft.

    - Functions are commented with their spec numbers, with spec differences commented.

    - Spec bugs are commented in this code with links.

    - Abstract functions have been combined where possible, and their associated functions
      commented.

    - Realm implementation is entirely omitted.

    - Loader module table iteration currently not yet implemented.

*********************************************************************************************
*/

// Some Helpers

// logs a linkset snapshot for debugging
/* function snapshot(loader) {
  console.log('---Snapshot---');
  for (var i = 0; i < loader.loads.length; i++) {
    var load = loader.loads[i];
    var linkSetLog = '  ' + load.name + ' (' + load.status + '): ';

    for (var j = 0; j < load.linkSets.length; j++) {
      linkSetLog += '{' + logloads(load.linkSets[j].loads) + '} ';
    }
    console.log(linkSetLog);
  }
  console.log('');
}
function logloads(loads) {
  var log = '';
  for (var k = 0; k < loads.length; k++)
    log += loads[k].name + (k != loads.length - 1 ? ' ' : '');
  return log;
} */


/* function checkInvariants() {
  // see https://bugs.ecmascript.org/show_bug.cgi?id=2603#c1

  var loads = System._loader.loads;
  var linkSets = [];

  for (var i = 0; i < loads.length; i++) {
    var load = loads[i];
    console.assert(load.status == 'loading' || load.status == 'loaded', 'Each load is loading or loaded');

    for (var j = 0; j < load.linkSets.length; j++) {
      var linkSet = load.linkSets[j];

      for (var k = 0; k < linkSet.loads.length; k++)
        console.assert(loads.indexOf(linkSet.loads[k]) != -1, 'linkSet loads are a subset of loader loads');

      if (linkSets.indexOf(linkSet) == -1)
        linkSets.push(linkSet);
    }
  }

  for (var i = 0; i < loads.length; i++) {
    var load = loads[i];
    for (var j = 0; j < linkSets.length; j++) {
      var linkSet = linkSets[j];

      if (linkSet.loads.indexOf(load) != -1)
        console.assert(load.linkSets.indexOf(linkSet) != -1, 'linkSet contains load -> load contains linkSet');

      if (load.linkSets.indexOf(linkSet) != -1)
        console.assert(linkSet.loads.indexOf(load) != -1, 'load contains linkSet -> linkSet contains load');
    }
  }

  for (var i = 0; i < linkSets.length; i++) {
    var linkSet = linkSets[i];
    for (var j = 0; j < linkSet.loads.length; j++) {
      var load = linkSet.loads[j];

      for (var k = 0; k < load.dependencies.length; k++) {
        var depName = load.dependencies[k].value;
        var depLoad;
        for (var l = 0; l < loads.length; l++) {
          if (loads[l].name != depName)
            continue;
          depLoad = loads[l];
          break;
        }

        // loading records are allowed not to have their dependencies yet
        // if (load.status != 'loading')
        //  console.assert(depLoad, 'depLoad found');

        // console.assert(linkSet.loads.indexOf(depLoad) != -1, 'linkset contains all dependencies');
      }
    }
  }
} */


(function (__global) {
  (function() {
    var Promise = __global.Promise || require('when/es6-shim/Promise');

    var traceur;

    var defineProperty;
    (function () {
      try {
        if (!!Object.defineProperty({}, 'a', {})) {
          defineProperty = Object.defineProperty;
        }
      } catch (e) {
        defineProperty = function (obj, prop, opt) {
          try {
            obj[prop] = opt.value || opt.get.call(obj);
          }
          catch(e) {}
        }
      }
    }());

    console.assert = console.assert || function() {};

    // IE8 support
    var indexOf = Array.prototype.indexOf || function(item) {
      for (var i = 0, thisLen = this.length; i < thisLen; i++) {
        if (this[i] === item) {
          return i;
        }
      }
      return -1;
    };

    // --- <Specific Traceur Parsing Code> ---
    // parse function is used to parse a load record
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
    // Returns an array of ModuleSpecifiers
    function parse(load) {
      if (!traceur) {
        if (typeof window == 'undefined')
          traceur = require('traceur');
        else if (__global.traceur)
          traceur = __global.traceur;
        else
          throw new TypeError('Include Traceur for module syntax support');
      }

      console.assert(load.source, 'Non-empty source');

      var depsList, curRegister, curSystem, oldSourceMaps, oldModules;
      (function () {
        try {
          var parser = new traceur.syntax.Parser(new traceur.syntax.SourceFile(load.address, load.source));
          var body = parser.parseModule();

          load.kind = 'declarative';
          depsList = getImports(body);

          oldSourceMaps = traceur.options.sourceMaps;
          oldModules = traceur.options.modules;

          traceur.options.sourceMaps = true;
          traceur.options.modules = 'instantiate';

          var reporter = new traceur.util.ErrorReporter();

          reporter.reportMessageInternal = function(location, kind, format, args) {
            throw new SyntaxError(kind, location.start && location.start.line_, location.start && location.start.column_);
          }

          // traceur expects its version of System
          curSystem = __global.System;
          __global.System = __global.traceurSystem;

          var tree = (new traceur.codegeneration.module.AttachModuleNameTransformer(load.name)).transformAny(body);
          tree = (new traceur.codegeneration.FromOptionsTransformer(reporter)).transform(tree);

          var sourceMapGenerator = new traceur.outputgeneration.SourceMapGenerator({ file: load.address });
          var options = { sourceMapGenerator: sourceMapGenerator };

          var source = traceur.outputgeneration.TreeWriter.write(tree, options);

          if (__global.btoa)
            source += '\n//# sourceMappingURL=data:application/json;base64,' + btoa(unescape(encodeURIComponent(options.sourceMap))) + '\n';

          // now run System.register
          curRegister = System.register;

          System.register = function(name, deps, declare) {
            // store the registered declaration as load.declare
            load.declare = typeof name == 'string' ? declare : deps;
          }

          __eval(source, __global, load.name);
        }
        catch(e) {
          if (e.name == 'SyntaxError' || e.name == 'TypeError')
            e.message = 'Evaluating ' + (load.name || load.address) + '\n\t' + e.message;
          if (curRegister)
            System.register = curRegister;
          if (curSystem)
            __global.System = curSystem;
          if (oldSourceMaps)
            traceur.options.sourceMaps = oldSourceMaps;
          if (oldModules)
            traceur.options.modules = oldModules;
          throw e;
        }
      }());
      System.register = curRegister;
      __global.System = curSystem;
      traceur.options.sourceMaps = oldSourceMaps;
      traceur.options.modules = oldModules;
      return depsList;
    }
    // --- </Specific Traceur Parsing Code> ---

    // 15.2.3 - Runtime Semantics: Loader State

    // 15.2.3.11
    function createLoaderLoad(object) {
      return {
        // modules is an object for ES5 implementation
        modules: {},
        loads: [],
        loaderObj: object
      };
    }

    // 15.2.3.2 Load Records and LoadRequest Objects

    // 15.2.3.2.1
    function createLoad(name) {
      return {
        status: 'loading',
        name: name,
        linkSets: [],
        dependencies: [],
        metadata: {}
      };
    }

    // 15.2.3.2.2 createLoadRequestObject, absorbed into calling functions

    // 15.2.4

    // 15.2.4.1
    function loadModule(loader, name, options) {
      return new Promise(asyncStartLoadPartwayThrough({
        step: options.address ? 'fetch' : 'locate',
        loader: loader,
        moduleName: name,
        moduleMetadata: {},
        moduleSource: options.source,
        moduleAddress: options.address
      }));
    }

    // 15.2.4.2
    function requestLoad(loader, request, refererName, refererAddress) {
      // 15.2.4.2.1 CallNormalize
      return new Promise(function(resolve, reject) {
        resolve(loader.loaderObj.normalize(request, refererName, refererAddress));
      })
      // 15.2.4.2.2 GetOrCreateLoad
      .then(function(name) {
        var load;
        if (loader.modules[name]) {
          load = createLoad(name);
          load.status = 'linked';
          // https://bugs.ecmascript.org/show_bug.cgi?id=2795
          // load.module = loader.modules[name];
          return load;
        }

        for (var i = 0, l = loader.loads.length; i < l; i++) {
          load = loader.loads[i];
          if (load.name != name)
            continue;
          console.assert(load.status == 'loading' || load.status == 'loaded', 'loading or loaded');
          return load;
        }

        load = createLoad(name);
        loader.loads.push(load);

        proceedToLocate(loader, load);

        return load;
      });
    }

    // 15.2.4.3
    function proceedToLocate(loader, load) {
      proceedToFetch(loader, load,
        Promise.resolve()
        // 15.2.4.3.1 CallLocate
        .then(function() {
          return loader.loaderObj.locate({ name: load.name, metadata: load.metadata });
        })
      );
    }

    // 15.2.4.4
    function proceedToFetch(loader, load, p) {
      proceedToTranslate(loader, load,
        p
        // 15.2.4.4.1 CallFetch
        .then(function(address) {
          // adjusted, see https://bugs.ecmascript.org/show_bug.cgi?id=2602
          if (load.status != 'loading')
            return;
          load.address = address;

          return loader.loaderObj.fetch({ name: load.name, metadata: load.metadata, address: address });
        })
      );
    }

    var anonCnt = 0;

    // 15.2.4.5
    function proceedToTranslate(loader, load, p) {
      p
      // 15.2.4.5.1 CallTranslate
      .then(function(source) {
        if (load.status != 'loading')
          return;
        return loader.loaderObj.translate({ name: load.name, metadata: load.metadata, address: load.address, source: source });
      })

      // 15.2.4.5.2 CallInstantiate
      .then(function(source) {
        if (load.status != 'loading')
          return;
        load.source = source;
        return loader.loaderObj.instantiate({ name: load.name, metadata: load.metadata, address: load.address, source: source });
      })

      // 15.2.4.5.3 InstantiateSucceeded
      .then(function(instantiateResult) {
        if (load.status != 'loading')
          return;

        var depsList;
        if (instantiateResult === undefined) {
          load.address = load.address || 'anon' + ++anonCnt;
          depsList = parse(load);
        }
        else if (typeof instantiateResult == 'object') {
          depsList = instantiateResult.deps || [];
          load.execute = instantiateResult.execute;
          load.kind = 'dynamic';
        }
        else
          throw TypeError('Invalid instantiate return value');

        // 15.2.4.6 ProcessLoadDependencies
        load.dependencies = [];
        load.depsList = depsList;

        var loadPromises = [];
        for (var i = 0, l = depsList.length; i < l; i++) (function(request, index) {
          loadPromises.push(
            requestLoad(loader, request, load.name, load.address)

            // 15.2.4.6.1 AddDependencyLoad (load is parentLoad)
            .then(function(depLoad) {

              console.assert(!load.dependencies.some(function(dep) {
                return dep.key == request;
              }), 'not already a dependency');

              // adjusted from spec to maintain dependency order
              // this is due to the System.register internal implementation needs
              load.dependencies[index] = {
                key: request,
                value: depLoad.name
              };

              if (depLoad.status != 'linked') {
                var linkSets = load.linkSets.concat([]);
                for (var i = 0, l = linkSets.length; i < l; i++)
                  addLoadToLinkSet(linkSets[i], depLoad);
              }

              // console.log('AddDependencyLoad ' + depLoad.name + ' for ' + load.name);
              // snapshot(loader);
            })
          );
        })(depsList[i], i);

        return Promise.all(loadPromises);
      })

      // 15.2.4.6.2 LoadSucceeded
      .then(function() {
        // console.log('LoadSucceeded ' + load.name);
        // snapshot(loader);

        console.assert(load.status == 'loading', 'is loading');

        load.status = 'loaded';

        var linkSets = load.linkSets.concat([]);
        for (var i = 0, l = linkSets.length; i < l; i++)
          updateLinkSetOnLoad(linkSets[i], load);
      })

      // 15.2.4.5.4 LoadFailed
      ['catch'](function(exc) {
        console.assert(load.status == 'loading', 'is loading on fail');
        load.status = 'failed';
        load.exception = exc;

        var linkSets = load.linkSets.concat([]);
        for (var i = 0, l = linkSets.length; i < l; i++)
          linkSetFailed(linkSets[i], exc);

        console.assert(load.linkSets.length == 0, 'linkSets not removed');
      });
    }

    // 15.2.4.7 PromiseOfStartLoadPartwayThrough absorbed into calling functions

    // 15.2.4.7.1
    function asyncStartLoadPartwayThrough(stepState) {
      return function(resolve, reject) {
        var loader = stepState.loader;
        var name = stepState.moduleName;
        var step = stepState.step;

        if (loader.modules[name])
          throw new TypeError('"' + name + '" already exists in the module table');

        // NB this still seems wrong for LoadModule as we may load a dependency
        // of another module directly before it has finished loading.
        // see https://bugs.ecmascript.org/show_bug.cgi?id=2994
        for (var i = 0, l = loader.loads.length; i < l; i++)
          if (loader.loads[i].name == name)
            throw new TypeError('"' + name + '" already loading');

        var load = createLoad(name);

        load.metadata = stepState.moduleMetadata;

        var linkSet = createLinkSet(loader, load);

        loader.loads.push(load);

        resolve(linkSet.done);

        if (step == 'locate')
          proceedToLocate(loader, load);

        else if (step == 'fetch')
          proceedToFetch(loader, load, Promise.resolve(stepState.moduleAddress));

        else {
          console.assert(step == 'translate', 'translate step');
          load.address = stepState.moduleAddress;
          proceedToTranslate(loader, load, Promise.resolve(stepState.moduleSource));
        }
      }
    }

    // Declarative linking functions run through alternative implementation:
    // 15.2.5.1.1 CreateModuleLinkageRecord not implemented
    // 15.2.5.1.2 LookupExport not implemented
    // 15.2.5.1.3 LookupModuleDependency not implemented

    // 15.2.5.2.1
    function createLinkSet(loader, startingLoad) {
      var linkSet = {
        loader: loader,
        loads: [],
        startingLoad: startingLoad, // added see spec bug https://bugs.ecmascript.org/show_bug.cgi?id=2995
        loadingCount: 0
      };
      linkSet.done = new Promise(function(resolve, reject) {
        linkSet.resolve = resolve;
        linkSet.reject = reject;
      });
      addLoadToLinkSet(linkSet, startingLoad);
      return linkSet;
    }
    // 15.2.5.2.2
    function addLoadToLinkSet(linkSet, load) {
      console.assert(load.status == 'loading' || load.status == 'loaded', 'loading or loaded on link set');

      for (var i = 0, l = linkSet.loads.length; i < l; i++)
        if (linkSet.loads[i] == load)
          return;

      linkSet.loads.push(load);
      load.linkSets.push(linkSet);

      // adjustment, see https://bugs.ecmascript.org/show_bug.cgi?id=2603
      if (load.status != 'loaded') {
        linkSet.loadingCount++;
      }

      var loader = linkSet.loader;

      for (var i = 0, l = load.dependencies.length; i < l; i++) {
        var name = load.dependencies[i].value;

        if (loader.modules[name])
          continue;

        for (var j = 0, d = loader.loads.length; j < d; j++) {
          if (loader.loads[j].name != name)
            continue;

          addLoadToLinkSet(linkSet, loader.loads[j]);
          break;
        }
      }
      // console.log('add to linkset ' + load.name);
      // snapshot(linkSet.loader);
    }

    function doLink(linkSet) {
      try {
        link(linkSet);
      }
      catch(exc) {
        linkSetFailed(linkSet, exc);
        return true;
      }
    }

    // 15.2.5.2.3
    function updateLinkSetOnLoad(linkSet, load) {
      // console.log('update linkset on load ' + load.name);
      // snapshot(linkSet.loader);

      console.assert(load.status == 'loaded' || load.status == 'linked', 'loaded or linked');

      linkSet.loadingCount--;

      if (linkSet.loadingCount > 0)
        return;

      // adjusted for spec bug https://bugs.ecmascript.org/show_bug.cgi?id=2995
      var startingLoad = linkSet.startingLoad;

      // non-executing link variation for loader tracing
      // on the server. Not in spec.
      /***/
      if (linkSet.loader.loaderObj.execute === false) {
        var loads = [].concat(linkSet.loads);
        for (var i = 0; i < loads.length; i++) {
          var load = loads[i];
          load.module = load.kind == 'dynamic' ? {
            module: _newModule({})
          } : {
            name: load.name,
            module: _newModule({}),
            evaluated: true
          };
          load.status = 'linked';
          finishLoad(linkSet.loader, load);
        }
        return linkSet.resolve(startingLoad);
      }
      /***/

      var abrupt = doLink(linkSet);

      if (abrupt)
        return;

      console.assert(linkSet.loads.length == 0, 'loads cleared');

      linkSet.resolve(startingLoad);
    }

    // 15.2.5.2.4
    function linkSetFailed(linkSet, exc) {
      var loader = linkSet.loader;
      var loads = linkSet.loads.concat([]);
      for (var i = 0, l = loads.length; i < l; i++) {
        var load = loads[i];

        // store all failed load records
        loader.loaderObj.failed = loader.loaderObj.failed || [];
        if (indexOf.call(loader.loaderObj.failed, load) == -1)
          loader.loaderObj.failed.push(load);

        var linkIndex = indexOf.call(load.linkSets, linkSet);
        console.assert(linkIndex != -1, 'link not present');
        load.linkSets.splice(linkIndex, 1);
        if (load.linkSets.length == 0) {
          var globalLoadsIndex = indexOf.call(linkSet.loader.loads, load);
          if (globalLoadsIndex != -1)
            linkSet.loader.loads.splice(globalLoadsIndex, 1);
        }
      }
      linkSet.reject(exc);
    }

    // 15.2.5.2.5
    function finishLoad(loader, load) {
      // add to global trace if tracing
      if (loader.loaderObj.trace) {
        if (!loader.loaderObj.loads)
          loader.loaderObj.loads = {};
        var depMap = {};
        load.dependencies.forEach(function(dep) {
          depMap[dep.key] = dep.value;
        });
        loader.loaderObj.loads[load.name] = {
          name: load.name,
          deps: load.dependencies.map(function(dep){ return dep.key }),
          depMap: depMap,
          address: load.address,
          metadata: load.metadata,
          source: load.source,
          kind: load.kind
        };
      }
      // if not anonymous, add to the module table
      if (load.name) {
        console.assert(!loader.modules[load.name], 'load not in module table');
        loader.modules[load.name] = load.module;
      }
      var loadIndex = indexOf.call(loader.loads, load);
      if (loadIndex != -1)
        loader.loads.splice(loadIndex, 1);
      for (var i = 0, l = load.linkSets.length; i < l; i++) {
        loadIndex = indexOf.call(load.linkSets[i].loads, load);
        if (loadIndex != -1)
          load.linkSets[i].loads.splice(loadIndex, 1);
      }
      load.linkSets.splice(0, load.linkSets.length);
    }

    // 15.2.5.3 Module Linking Groups

    // 15.2.5.3.2 BuildLinkageGroups alternative implementation
    // Adjustments (also see https://bugs.ecmascript.org/show_bug.cgi?id=2755)
    // 1. groups is an already-interleaved array of group kinds
    // 2. load.groupIndex is set when this function runs
    // 3. load.groupIndex is the interleaved index ie 0 declarative, 1 dynamic, 2 declarative, ... (or starting with dynamic)
    function buildLinkageGroups(load, loads, groups, loader) {
      groups[load.groupIndex] = groups[load.groupIndex] || [];

      // if the load already has a group index and its in its group, its already been done
      // this logic naturally handles cycles
      if (indexOf.call(groups[load.groupIndex], load) != -1)
        return;

      // now add it to the group to indicate its been seen
      groups[load.groupIndex].push(load);

      for (var i = 0; i < loads.length; i++) {
        var loadDep = loads[i];

        // dependencies not found are already linked
        for (var j = 0; j < load.dependencies.length; j++) {
          if (loadDep.name == load.dependencies[j].value) {
            // by definition all loads in linkset are loaded, not linked
            console.assert(loadDep.status == 'loaded', 'Load in linkSet not loaded!');

            // if it is a group transition, the index of the dependency has gone up
            // otherwise it is the same as the parent
            var loadDepGroupIndex = load.groupIndex + (loadDep.kind != load.kind);

            // the group index of an entry is always the maximum
            if (loadDep.groupIndex === undefined || loadDep.groupIndex < loadDepGroupIndex) {

              // if already in a group, remove from the old group
              if (loadDep.groupIndex) {
                groups[loadDep.groupIndex].splice(indexOf.call(groups[loadDep.groupIndex], loadDep), 1);

                // if the old group is empty, then we have a mixed depndency cycle
                if (groups[loadDep.groupIndex].length == 0)
                  throw new TypeError("Mixed dependency cycle detected");
              }

              loadDep.groupIndex = loadDepGroupIndex;
            }

            buildLinkageGroups(loadDep, loads, groups, loader);
          }
        }
      }
    }

    // 15.2.5.4
    function link(linkSet) {

      var loader = linkSet.loader;

      if (!linkSet.loads.length)
        return;

      // console.log('linking {' + logloads(linkSet.loads) + '}');
      // snapshot(loader);

      // 15.2.5.3.1 LinkageGroups alternative implementation

      // build all the groups
      // because the first load represents the top of the tree
      // for a given linkset, we can work down from there
      var groups = [];
      var startingLoad = linkSet.loads[0];
      startingLoad.groupIndex = 0;
      buildLinkageGroups(startingLoad, linkSet.loads, groups, loader);

      // determine the kind of the bottom group
      var curGroupDeclarative = (startingLoad.kind == 'declarative') == groups.length % 2;

      // run through the groups from bottom to top
      for (var i = groups.length - 1; i >= 0; i--) {
        var group = groups[i];
        for (var j = 0; j < group.length; j++) {
          var load = group[j];

          // 15.2.5.5 LinkDeclarativeModules adjusted
          if (curGroupDeclarative) {
            linkDeclarativeModule(load, linkSet.loads, loader);
          }
          // 15.2.5.6 LinkDynamicModules adjusted
          else {
            var module = load.execute();
            if (!module || !(module instanceof Module))
              throw new TypeError('Execution must define a Module instance');
            load.module = {
              module: module
            };
            load.status = 'linked';
          }
          finishLoad(loader, load);
        }

        // alternative current kind for next loop
        curGroupDeclarative = !curGroupDeclarative;
      }
    }

    // custom declarative linking function
    function linkDeclarativeModule(load, loads, loader) {
      if (load.module)
        return;

      // declare the module with an empty depMap
      var depMap = [];

      var registryEntry = load.declare.call(__global, depMap);

      var moduleDependencies = [];

      // module is just a plain object, until we evaluate it
      var module = registryEntry.exports;

      console.assert(!load.module, 'Load module already declared!');

      load.module = {
        name: load.name,
        dependencies: moduleDependencies,
        execute: registryEntry.execute,
        exports: module,
        evaluated: false
      };

      // now link all the module dependencies
      // amending the depMap as we go
      for (var i = 0; i < load.dependencies.length; i++) {
        var depName = load.dependencies[i].value;
        var depModule;
        // if dependency already a module, use that
        if (loader.modules[depName]) {
          depModule = loader.modules[depName];
        }
        else {
          for (var j = 0; j < loads.length; j++) {
            if (loads[j].name != depName)
              continue;

            // only link if already not already started linking (stops at circular / dynamic)
            if (!loads[j].module)
              linkDeclarativeModule(loads[j], loads, loader);

            depModule = loads[j].module;
          }
        }

        var depModuleModule = depModule.exports || depModule.module;

        console.assert(depModule, 'Dependency module not found!');

        if (registryEntry.exportStar && indexOf.call(registryEntry.exportStar, load.dependencies[i].key) != -1) {
          // we are exporting * from this dependency
          (function(depModuleModule) {
            for (var p in depModuleModule) (function(p) {
              // if the property is already defined throw?
              defineProperty(module, p, {
                enumerable: true,
                get: function() {
                  return depModuleModule[p];
                },
                set: function(value) {
                  depModuleModule[p] = value;
                }
              });
            })(p);
          })(depModuleModule);
        }

        moduleDependencies.push(depModule);
        depMap[i] = depModuleModule;
      }

      load.status = 'linked';
    }



    // 15.2.5.5.1 LinkImports not implemented
    // 15.2.5.7 ResolveExportEntries not implemented
    // 15.2.5.8 ResolveExports not implemented
    // 15.2.5.9 ResolveExport not implemented
    // 15.2.5.10 ResolveImportEntries not implemented

    // 15.2.6.1
    function evaluateLoadedModule(loader, load) {
      console.assert(load.status == 'linked', 'is linked ' + load.name);

      doEnsureEvaluated(load.module, [], loader);
      return load.module.module;
    }

    /*
     * Module Object non-exotic for ES5:
     *
     * module.module        bound module object
     * module.execute       execution function for module
     * module.dependencies  list of module objects for dependencies
     *
     */
    function doExecute(module) {
      try {
        module.execute.call(__global);
      }
      catch(e) {
        return e;
      }
    }

    // propogate execution errors
    // see https://bugs.ecmascript.org/show_bug.cgi?id=2993
    function doEnsureEvaluated(module, seen, loader) {
      var err = ensureEvaluated(module, seen, loader);
      if (err)
        throw err;
    }
    // 15.2.6.2 EnsureEvaluated adjusted
    function ensureEvaluated(module, seen, loader) {
      if (module.evaluated || !module.dependencies)
        return;

      seen.push(module);

      var deps = module.dependencies;
      var err;

      for (var i = 0; i < deps.length; i++) {
        var dep = deps[i];
        if (indexOf.call(seen, dep) == -1) {
          err = ensureEvaluated(dep, seen, loader);
          // stop on error, see https://bugs.ecmascript.org/show_bug.cgi?id=2996
          if (err)
            return err + '\n  in module ' + dep.name;
        }
      }

      if (module.failed)
        return new Error('Module failed execution.');

      if (module.evaluated)
        return;

      module.evaluated = true;
      err = doExecute(module);
      if (err)
        module.failed = true;
      module.module = _newModule(module.exports);
      module.execute = undefined;
      return err;
    }

    // 26.3 Loader

    // 26.3.1.1
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

      this._loader = {
        loaderObj: this,
        loads: [],
        modules: {}
      };

      // 26.3.3.6
      defineProperty(this, 'global', {
        get: function() {
          return __global;
        }
      });

      // 26.3.3.13 realm not implemented
    }

    function Module() {}

    // importPromises adds ability to import a module twice without error - https://bugs.ecmascript.org/show_bug.cgi?id=2601
    var importPromises = {};
    function createImportPromise(name, promise) {
      importPromises[name] = promise;
      promise.then(function() {
        importPromises[name] = undefined;
      });
      promise['catch'](function() {
        importPromises[name] = undefined;
      });
      return promise;
    }

    Loader.prototype = {
      // 26.3.3.1
      constructor: Loader,
      // 26.3.3.2
      define: function(name, source, options) {
        // check if already defined
        if (importPromises[name])
          throw new TypeError('Module is already loading.');
        return createImportPromise(name, new Promise(asyncStartLoadPartwayThrough({
          step: 'translate',
          loader: this._loader,
          moduleName: name,
          moduleMetadata: options && options.metadata || {},
          moduleSource: source,
          moduleAddress: options && options.address
        })));
      },
      // 26.3.3.3
      'delete': function(name) {
        return this._loader.modules[name] ? delete this._loader.modules[name] : false;
      },
      // 26.3.3.4 entries not implemented
      // 26.3.3.5
      get: function(key) {
        if (!this._loader.modules[key])
          return;
        doEnsureEvaluated(this._loader.modules[key], [], this);
        return this._loader.modules[key].module;
      },
      // 26.3.3.7
      has: function(name) {
        return !!this._loader.modules[name];
      },
      // 26.3.3.8
      'import': function(name, options) {
        // run normalize first
        var loaderObj = this;

        // added, see https://bugs.ecmascript.org/show_bug.cgi?id=2659
        return Promise.resolve(loaderObj.normalize(name, options && options.name, options && options.address))
        .then(function(name) {
          var loader = loaderObj._loader;

          if (loader.modules[name]) {
            doEnsureEvaluated(loader.modules[name], [], loader._loader);
            return loader.modules[name].module;
          }

          return importPromises[name] || createImportPromise(name, 
            loadModule(loader, name, options || {})
            .then(function(load) {
              delete importPromises[name];
              return evaluateLoadedModule(loader, load);
            }));
        });
      },
      // 26.3.3.9 keys not implemented
      // 26.3.3.10
      load: function(name, options) {
        if (this._loader.modules[name]) {
          doEnsureEvaluated(this._loader.modules[name], [], this._loader);
          return Promise.resolve(this._loader.modules[name].module);
        }
        return importPromises[name] || createImportPromise(name, loadModule(this._loader, name, {}));
      },
      // 26.3.3.11
      module: function(source, options) {
        var load = createLoad();
        load.address = options && options.address;
        var linkSet = createLinkSet(this._loader, load);
        var sourcePromise = Promise.resolve(source);
        var loader = this._loader;
        var p = linkSet.done.then(function() {
          return evaluateLoadedModule(loader, load);
        });
        proceedToTranslate(loader, load, sourcePromise);
        return p;
      },
      // 26.3.3.12
      newModule: function (obj) {
        if (typeof obj != 'object')
          throw new TypeError('Expected object');

        // we do this to be able to tell if a module is a module privately in ES5
        // by doing m instanceof Module
        var m = new Module();

        for (var key in obj) {
          (function (key) {
            defineProperty(m, key, {
              configurable: false,
              enumerable: true,
              get: function () {
                return obj[key];
              }
            });
          })(key);
        }

        if (Object.preventExtensions)
          Object.preventExtensions(m);

        return m;
      },
      // 26.3.3.14
      set: function(name, module) {
        if (!(module instanceof Module))
          throw new TypeError('Set must be a module');
        this._loader.modules[name] = {
          module: module
        };
      },
      // 26.3.3.15 values not implemented
      // 26.3.3.16 @@iterator not implemented
      // 26.3.3.17 @@toStringTag not implemented

      // 26.3.3.18.1
      normalize: function(name, referrerName, referrerAddress) {
        return name;
      },
      // 26.3.3.18.2
      locate: function(load) {
        return load.name;
      },
      // 26.3.3.18.3
      fetch: function(load) {
        throw new TypeError('Fetch not implemented');
      },
      // 26.3.3.18.4
      translate: function(load) {
        return load.source;
      },
      // 26.3.3.18.5
      instantiate: function(load) {
      }
    };

    var _newModule = Loader.prototype.newModule;

    if (typeof exports === 'object')
      module.exports = Loader;

    __global.Reflect = __global.Reflect || {};
    __global.Reflect.Loader = __global.Reflect.Loader || Loader;
    __global.LoaderPolyfill = Loader;

  })();

  function __eval(__source, __global, __moduleName) {
    eval('var __moduleName = "' + (__moduleName || '').replace('"', '\"') + '"; (function() { ' + __source + ' \n }).call(__global);');
  }

})(typeof global !== 'undefined' ? global : this);

/*
*********************************************************************************************

  System Loader Implementation

    - Implemented to https://github.com/jorendorff/js-loaders/blob/master/browser-loader.js

    - <script type="module"> supported

*********************************************************************************************
*/

(function (global) {
  var isBrowser = typeof window != 'undefined';
  var Loader = global.Reflect && global.Reflect.Loader || require('./loader');
  var Promise = global.Promise || require('es6-promise').Promise;

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
  function toAbsoluteURL(base, href) {

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
      var sameDomain = true;
      if (!('withCredentials' in xhr)) {
        // check if same domain
        var domainCheck = /^(\w+:)?\/\/([^\/]+)/.exec(url);
        if (domainCheck) {
          sameDomain = domainCheck[2] === window.location.host;
          if (domainCheck[1])
            sameDomain &= domainCheck[1] === window.location.protocol;
        }
      }
      if (!sameDomain) {
        xhr = new XDomainRequest();
        xhr.onload = load;
        xhr.onerror = error;
        xhr.ontimeout = error;
      }
      function load() {
        fulfill(xhr.responseText);
      }
      function error() {
        reject(xhr.statusText + ': ' + url || 'XHR error');
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200 || (xhr.status == 0 && xhr.responseText)) {
            load();
          } else {
            error();
          }
        }
      };
      xhr.open("GET", url, true);
      xhr.send(null);
    }
  }
  else {
    var fs;
    fetchTextFromURL = function(url, fulfill, reject) {
      fs = fs || require('fs');
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
          throw new TypeError('Illegal module name "' + name + '"');
      }

      if (!rel)
        return name;

      // build the full module name
      var normalizedParts = [];
      var parentParts = (parentName || '').split('/');
      var normalizedLen = parentParts.length - 1 - dotdots;

      normalizedParts = normalizedParts.concat(parentParts.splice(0, parentParts.length - 1 - dotdots));
      normalizedParts = normalizedParts.concat(segments.splice(i, segments.length - i));

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
      return new Promise(function(resolve, reject) {
        fetchTextFromURL(toAbsoluteURL(this.baseURL, load.address), function(source) {
          resolve(source);
        }, reject);
      });
    }
  });

  if (isBrowser) {
    var href = window.location.href.split('#')[0].split('?')[0];
    System.baseURL = href.substring(0, href.lastIndexOf('/') + 1);
  }
  else {
    System.baseURL = './';
  }
  System.paths = { '*': '*.js' };

  if (global.System && global.traceur)
    global.traceurSystem = global.System;

  if (isBrowser)
    global.System = System;

  // <script type="module"> support
  // allow a data-init function callback once loaded
  if (isBrowser) {
    var curScript = document.getElementsByTagName('script');
    curScript = curScript[curScript.length - 1];

    function completed() {
      document.removeEventListener( "DOMContentLoaded", completed, false );
      window.removeEventListener( "load", completed, false );
      ready();
    }

    function ready() {
      var scripts = document.getElementsByTagName('script');

      for (var i = 0; i < scripts.length; i++) {
        var script = scripts[i];
        if (script.type == 'module') {
          var source = script.innerHTML;
          System.module(source)['catch'](function(err) { setTimeout(function() { throw err; }); });
        }
      }
    }

    // DOM ready, taken from https://github.com/jquery/jquery/blob/master/src/core/ready.js#L63
    if (document.readyState === 'complete') {
      setTimeout(ready);
    }
    else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', completed, false);
      window.addEventListener('load', completed, false);
    }

    // run the data-init function on the script tag
    if (curScript.getAttribute('data-init'))
      window[curScript.getAttribute('data-init')]();
  }

  if (typeof exports === 'object')
    module.exports = System;

})(typeof global !== 'undefined' ? global : this);


// es6-module-loader doesn't export to the current scope in node
var Loader, Module;
if (typeof exports !== 'undefined') {
	if (typeof Loader === 'undefined') Loader = exports.Loader;
	if (typeof Module === 'undefined') Module = exports.Module;
}

/** RaveJS */
/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
(function (exports, global) {
var rave, document, defaultMain, debugMain, hooksName,
	context, loader, define;

rave = exports || {};

document = global.document;

defaultMain = 'rave/auto';
debugMain = 'rave/debug';
hooksName = 'rave/src/hooks';

// export testable functions
rave.boot = boot;
rave.getCurrentScript = getCurrentScript;
rave.mergeBrowserOptions = mergeBrowserOptions;
rave.mergeNodeOptions = mergeNodeOptions;
rave.simpleDefine = simpleDefine;

// initialize
rave.scriptUrl = getCurrentScript();
rave.scriptPath = getPathFromUrl(rave.scriptUrl);
rave.baseUrl = document
	? getPathFromUrl(document.location.origin + document.location.pathname)
	: __dirname;

context = (document ? mergeBrowserOptions : mergeNodeOptions)({
	raveMain: defaultMain,
	raveScript: rave.scriptUrl,
	baseUrl: rave.baseUrl,
	loader: new Reflect.Loader({})
});

loader = context.loader;
define = simpleDefine(loader);
define.amd = {};

function boot (context) {
	var main = context.raveMain;
	try {
		// check if we should load debugMain instead
		if (context.debug || context.raveDebug) {
			// don't override main if user changed it with <html> attr
			if (context.raveMain === defaultMain) context.raveMain = debugMain;
		}
		// apply hooks overrides to loader
		var hooks = fromLoader(loader.get(hooksName));
		// extend loader
		hooks(context);
		loader.import(context.raveMain).then(go, failLoudly);
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
	if (document && document.currentScript) return document.currentScript.src;

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

function mergeBrowserOptions (context) {
	var el = document.documentElement, i, attr, prop;
	for (i = 0; i < el.attributes.length; i++) {
		attr = el.attributes[i];
		prop = attr.name.slice(5).replace(/(?:data)?-(.)/g, camelize);
		if (prop) context[prop] = attr.value || true;
	}
	return context;
	function camelize (m, l) { return l.toUpperCase();}
}

function mergeNodeOptions (context) {
	// TODO
	return context;
}

function simpleDefine (loader) {
	var _global;
	// temporary work-around for es6-module-loader which throws when
	// accessing loader.global
	try { _global = loader.global } catch (ex) { _global = global; }
	return function (id, deps, factory) {
		var scoped, modules, i, len, isCjs = false, value;
		scoped = {
			require: function (id) { return fromLoader(loader.get(id)); },
			exports: {},
			global: _global
		};
		scoped.module = { exports: scoped.exports };
		modules = [];
		// if deps has been omitted
		if (arguments.length === 2) {
			factory = deps;
			deps = ['require', 'exports', 'module'].slice(factory.length);
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
		loader.set(id, loader.newModule(value));
	};
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



;define('rave/pipeline/locateAsIs', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = locateAsIs;

function locateAsIs (load) {
	return load.name;
}

});


;define('rave/pipeline/translateAsIs', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = translateAsIs;

function translateAsIs (load) {
	return load.source;
}

});


;define('rave/lib/path', ['require', 'exports', 'module'], function (require, exports, module, define) {var absUrlRx, findDotsRx;

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


;define('rave/lib/beget', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = beget;

function Begetter () {}
function beget (base) {
	var obj;
	Begetter.prototype = base;
	obj = new Begetter();
	Begetter.prototype = null;
	return obj;
}

});


;define('rave/lib/fetchText', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = fetchText;

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


;define('rave/lib/addSourceUrl', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = addSourceUrl;

function addSourceUrl (url, source) {
	return source
		+ '\n//# sourceURL='
		+ url.replace(/\s/g, '%20')
		+ '\n';
}

});


;define('rave/lib/es5Transform', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = {
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


;define('rave/lib/es5SideRegistry', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.set = add;
exports.get = get;
exports.has = has;
exports.remove = remove;

// shared registry
var registry = {};

function add (id, execute) {
	return registry[id] = executeOnce(id, execute);
}

function get (id) {
	return registry[id]();
}

function has (id) {
	return id in registry;
}

function remove (id) {
	var execute = registry[id];
	delete registry[id];
	return execute;
}

function executeOnce (id, execute) {
	return function () {
		var value = execute.apply(this, arguments);
		// replace registry entry with a simple execute function
		add(id, simpleExecute(value));
		return value;
	};
}

function simpleExecute (value) {
	return function () { return value; };
}

});


;define('rave/load/predicate', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.composePredicates = composePredicates;
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


;define('rave/load/specificity', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.compare = compareFilters;
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


;define('rave/lib/uid', ['require', 'exports', 'module'], function (require, exports, module, define) {exports.create = createUid;
exports.parse = parseUid;
exports.getName = getName;

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
	};
}


function getName (uid) {
	return uid.split("#").pop();
}

});


;define('rave/lib/find/createCodeFinder', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = createCodeFinder;

// Export private functions for testing
createCodeFinder.composeRx = composeRx;
createCodeFinder.rxStringContents = rxStringContents;
createCodeFinder.skipTo = skipTo;

var trimRegExpRx = /^\/|\/[gim]*$/g;

// Look for code transitions.
var defaultTransitionsRx = composeRx(
	// Detect strings, blank strings, and comments.
	/(''?|""?|\/\/|\/\*)/,
	// Detect RegExps by excluding division sign and comments
	/(?:[\-+*\/=\,%&|^!(;\{\[<>]\s*)(\/)(?!\/|\*)/,
	'g'
);

// RegExps to find end of strings, comments, RegExps in code
// We can't detect blank strings easily, so we handle those specifically.
var defaultSkippers = {
	"''": false,
	'""': false,
	"'": /\\\\'|[^\\]'/g,
	'"': /\\\\"|[^\\]"/g,
	'//': /\n|$/g,
	'/*': /\*\//g,
	'/': /\\\\\/|[^\\]\//g
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
		var matches, index, rx, trans;

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

	if (!rx.exec(source)) {
		throw new Error(
			'Unterminated comment, string, or RegExp at '
			+ index + ' near ' + source.slice(index - 50, 100)
		);
	}

	return rx.lastIndex;
}

function composeRx (rx1, rx2, flags) {
	return new RegExp(rxStringContents(rx1)
		+ '|' + rxStringContents(rx2), flags);
}

function rxStringContents (rx) {
	return rx.toString().replace(trimRegExpRx, '');
}

});


;define('rave/pipeline/fetchAsText', ['require', 'exports', 'module', 'rave/lib/fetchText'], function (require, exports, module, $cram_r0, define) {module.exports = fetchAsText;

var fetchText = $cram_r0;

function fetchAsText (load) {
	return new Promise(function(resolve, reject) {
		fetchText(load.address, resolve, reject);
	});

}

});


;define('rave/pipeline/normalizeCjs', ['require', 'exports', 'module', 'rave/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

module.exports = normalizeCjs;

var reduceLeadingDots = path.reduceLeadingDots;

function normalizeCjs (name, refererName, refererUrl) {
	return reduceLeadingDots(String(name), refererName || '');
}

});


;define('rave/pipeline/instantiateJson', ['require', 'exports', 'module', 'rave/lib/es5Transform', 'rave/lib/addSourceUrl'], function (require, exports, module, $cram_r0, $cram_r1, define) {var es5Transform = $cram_r0;
var addSourceUrl = $cram_r1;

module.exports = instantiateJson;

function instantiateJson (load) {
	var source, loader;

	source = '(' + load.source + ')';
	loader = load.metadata.rave.loader;

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		source = addSourceUrl(load.address, source);
	}

	return {
		execute: function () {
			return loader.newModule(es5Transform.toLoader(eval(source)));
		}
	};
}

});


;define('rave/load/override', ['require', 'exports', 'module', 'rave/load/predicate', 'rave/load/specificity', 'rave/lib/uid'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var predicate = $cram_r0;
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


;define('rave/lib/nodeFactory', ['require', 'exports', 'module', 'rave/lib/es5Transform'], function (require, exports, module, $cram_r0, define) {module.exports = nodeFactory;

var es5Transform = $cram_r0;

var nodeEval = new Function(
	'require', 'exports', 'module', 'global',
	'eval(arguments[4]);'
);

var _global;

_global = typeof global !== 'undefined' ? global : window;

function nodeFactory (require, load) {
	var name, source, exports, module;

	name = load.name;
	source = load.source;
	exports = {};
	module = { id: name, uri: load.address, exports: exports };

	return function () {
		// TODO: use loader.global when es6-module-loader implements it
		nodeEval(require, module.exports, module, _global, source);
		// figure out what author intended to export
		return exports === module.exports
			? exports // a set of named exports
			: es5Transform.toLoader(module.exports); // a single default export
	};
}

});


;define('rave/lib/find/requires', ['require', 'exports', 'module', 'rave/lib/find/createCodeFinder'], function (require, exports, module, $cram_r0, define) {module.exports = findRequires;

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


;define('rave/lib/createRequire', ['require', 'exports', 'module', 'rave/lib/es5Transform'], function (require, exports, module, $cram_r0, define) {module.exports = createRequire;

var es5Transform = $cram_r0;

function createRequire (syncGet, asyncGet) {

	// Implement proposed require.async, just like Montage Require:
	// https://github.com/montagejs/mr, but with an added `names`
	// parameter.
	require.async = function (id) {
		var names;
		names = arguments[1];
		return asyncGet(id).then(function (value) {
			return names ? getExports(names, value) : value;
		});
	};

	require.named = namedRequire;

	return require;

	function require (id) {
		return syncGet(id);
	}

	function namedRequire (id, names) {
		return names
			? getExports(names, syncGet(id))
			: require(id);
	}
}

function getExports (names, value) {
	var exports, i;
	exports = {};
	for (i = 0; i < names.length; i++) {
		exports[names[i]] = value[names[i]];
	}
	return exports;
}

});


;define('rave/pipeline/instantiateNode', ['require', 'exports', 'module', 'rave/lib/find/requires', 'rave/lib/nodeFactory', 'rave/lib/addSourceUrl', 'rave/lib/es5Transform', 'rave/lib/es5SideRegistry', 'rave/lib/createRequire'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, $cram_r5, define) {var findRequires = $cram_r0;
var nodeFactory = $cram_r1;
var addSourceUrl = $cram_r2;
var es5Transform = $cram_r3;
var es5SideRegistry = $cram_r4;
var createRequire = $cram_r5;

module.exports = instantiateNode;

function instantiateNode (load) {
	var loader, deps, depsMap, require, factory;

	loader = load.metadata.rave.loader;
	deps = findOrThrow(load);
	depsMap = {};

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	require = createRequire(getSync, getAsync);
	factory = nodeFactory(require, load);

	es5SideRegistry.set(load.name, execute);

	// normalize deps (async) and save in depMap so getSync can run sync
	return Promise.all(deps.map(normalizeDep))
		.then(function () {
			return {
				deps: deps,
				execute: function () {
					var value = es5SideRegistry.get(load.name);
					// remove from registry
					es5SideRegistry.remove(load.name);
					return value;
				}
			};
		});

	function execute () {
		return loader.newModule(factory());
	}

	function normalizeDep (dep) {
		return Promise.resolve(loader.normalize(dep, load.name, load.address))
			.then(function (normalized) {
				depsMap[dep] = normalized;
			});
	}

	function getSync (id) {
		var abs, value;
		abs = depsMap[id];
		value = es5SideRegistry.has(abs)
			? es5SideRegistry.get(abs)
			: loader.get(abs);
		return es5Transform.fromLoader(value);
	}

	function getAsync (id) {
		return loader
			.import(id, { name: load.name })
			.then(es5Transform.fromLoader);
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


;define('rave/src/hooks', ['require', 'exports', 'module', 'rave/pipeline/normalizeCjs', 'rave/pipeline/locateAsIs', 'rave/pipeline/fetchAsText', 'rave/pipeline/translateAsIs', 'rave/pipeline/instantiateNode', 'rave/pipeline/instantiateJson', 'rave/lib/path', 'rave/lib/beget', 'rave/load/override'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, $cram_r5, $cram_r6, $cram_r7, $cram_r8, define) {var normalizeCjs = $cram_r0;
var locateAsIs = $cram_r1;
var fetchAsText = $cram_r2;
var translateAsIs = $cram_r3;
var instantiateNode = $cram_r4;
var instantiateJson = $cram_r5;
var path = $cram_r6;
var beget = $cram_r7;
var override = $cram_r8;

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
			instantiate: instantiateNode
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



// start!
rave.boot(context);

}(
	typeof exports !== 'undefined' ? exports : void 0,
	typeof global !== 'undefined' && global
		|| typeof window !== 'undefined' && window
		|| typeof self !== 'undefined' && self
));
