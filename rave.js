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
var rave, document, defaultMain,
	context, loader, legacy, define;

rave = exports || {};

document = global.document;

defaultMain = 'rave/auto';

// export testable functions
rave.boot = boot;
rave.getCurrentScript = getCurrentScript;
rave.mergeBrowserOptions = mergeBrowserOptions;
rave.mergeNodeOptions = mergeNodeOptions;
rave.simpleDefine = simpleDefine;
rave.legacyAccessors = legacyAccessors;

// initialize
rave.scriptUrl = getCurrentScript();
rave.scriptPath = getPathFromUrl(rave.scriptUrl);
rave.baseUrl = document
	? getPathFromUrl(document.location.href)
	: __dirname;

context = (document ? mergeBrowserOptions : mergeNodeOptions)({
	raveMain: defaultMain,
	baseUrl: rave.baseUrl,
	loader: new Loader({}),
	packages: { rave: rave.scriptUrl }
});

loader = context.loader;
legacy = legacyAccessors(loader);
define = simpleDefine(legacy);
define.amd = {};

function boot (context) {
	try {
		// apply pipeline to loader
		var pipeline = legacy.get('rave/src/pipeline');
		// extend loader
		pipeline(context).applyTo(loader);
		loader.import(context.raveMain).then(go, failLoudly);
	}
	catch (ex) {
		failLoudly(ex);
	}
	function go (main) {
		var childContext = beget(context);
		if (!main) failLoudly(new Error('No main module.'));
		else if (typeof main.main === 'function') main.main(childContext);
		else if (typeof main === 'function') main(childContext);
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
	// TODO: have this return {id, deps, factory} instead of eagerly instantiating
	var _global;
	// temporary work-around for es6-module-loader which throws when
	// accessing loader.global
	try { _global = loader.global } catch (ex) { _global = global; }
	return function (id, deps, factory) {
		var scoped, modules, i, len, isCjs, result;
		scoped = {
			require: loader.get,
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
		result = factory.apply(null, modules);
		loader.set(id, isCjs ? scoped.module.exports : result);
	};
}

function legacyAccessors (loader) {
	// TODO: could we use rave/lib/legacy instead of this?
	var get = loader.get;
	var set = loader.set;
	var legacy = beget(loader);

	legacy.get = function (id) {
		var value = get.call(loader, id);
		return value && value.__es5Module ? value.__es5Module : value;
	};
	legacy.set = function (id, module) {
		var value = typeof module === 'object' ? module : {
			// for real ES6 modules to consume this module
			'default': module,
			// for modules transpiled from ES6
			__es5Module: module
		};
		// TODO: spec is ambiguous whether Module is a constructor or factory
		set.call(loader, id, new Module(value));
	};

	return legacy;
}

// TODO: could we use rave/lib/beget instead of this?
function Begetter () {}
function beget (base) {
	var obj;
	Begetter.prototype = base;
	obj = new Begetter();
	Begetter.prototype = null;
	return obj;
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


;define('rave/pipeline/translateWrapInNode', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = translateWrapInNode;

function translateWrapInNode (load) {
	// The \n allows for a comment on the last line!
	return 'module.exports = ' + load.source + '\n;';
}

});


;define('rave/lib/overrideIf', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = overrideIf;

function overrideIf (predicate, base, props) {
	for (var p in props) {
		if (p in base) {
			base[p] = choice(predicate, props[p], base[p]);
		}
	}
}

function choice (predicate, a, b) {
	return function () {
		var f = predicate.apply(this, arguments) ? a : b;
		return f.apply(this, arguments);
	};
}

});


;define('rave/lib/createFileExtFilter', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = createFileExtFilter;

/**
 * Creates a filter for a loader pipeline based on file extensions.
 * @param {string|Array<string>|Object} extensions may be a single string
 *   containing a comma-separated list of file extensions, an array of file
 *   extensions, or an Object literal whose keys are file extensions.
 * @returns {function(Object|string): boolean}
 */
function createFileExtFilter (extensions) {
	var map = toHashmap(extensions);
	return function (load) {
		var name = typeof load === 'object' ? load.name : load;
		var dot = name ? name.lastIndexOf('.') : -1;
		var slash = name ? name.lastIndexOf('/') : -1;
		return dot > slash && map.hasOwnProperty(name.slice(dot + 1));
	}
}

function toHashmap (it) {
	var map = {}, i;
	if (!it) {
		throw new TypeError('Invalid type passed to createFileExtFilter.');
	}
	if (typeof it === 'string') {
		it = it.split(/\s*,\s*/);
	}
	if (it.length) {
		for (i = 0; i < it.length; i++) {
			map[it[i]] = 1;
		}
	}
	else {
		for (i in it) {
			map[i] = 1;
		}
	}
	return map;
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
	var hasExt = path.lastIndexOf('.') > path.lastIndexOf('/');
	return hasExt ? path : path + ext;
}

/**
 * REmoves a file extension from a path.
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
 * the referer's id/path.
 * @param {string} childId
 * @param {string} baseId
 * @return {string}
 */
function reduceLeadingDots (childId, baseId) {
	var removeLevels, normId, levels, isRelative, diff;
	// this algorithm is similar to dojo's compactPath, which
	// interprets module ids of "." and ".." as meaning "grab the
	// module whose name is the same as my folder or parent folder".
	// These special module ids are not included in the AMD spec
	// but seem to work in node.js, too.

	removeLevels = 1;
	normId = childId;

	// remove leading dots and count levels
	if (isRelPath(normId)) {
		isRelative = true;
		// replaceDots also counts levels
		normId = normId.replace(findDotsRx, replaceDots);
	}

	if (isRelative) {
		levels = baseId.split('/');
		diff = levels.length - removeLevels;
		if (diff < 0) {
			// this is an attempt to navigate above parent module.
			// maybe dev wants a url or something. punt and return url;
			return childId;
		}
		levels.splice(diff, removeLevels);
		// normId || [] prevents concat from adding extra "/" when
		// normId is reduced to a blank string
		return levels.concat(normId || []).join('/');
	}
	else {
		return normId;
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


;define('rave/lib/findRequires', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = findRequires;

var removeCommentsRx, findRValueRequiresRx;

removeCommentsRx = /\/\*[\s\S]*?\*\/|\/\/.*?[\n\r]/g;
findRValueRequiresRx = /require\s*\(\s*(["'])(.*?[^\\])\1\s*\)|[^\\]?(["'])/g;

function findRequires (source) {
	var deps, seen, clean, currQuote;

	deps = [];
	seen = {};

	// remove comments, then look for require() or quotes
	clean = source.replace(removeCommentsRx, '');
	clean.replace(findRValueRequiresRx, function (m, rq, id, qq) {
		// if we encounter a string in the source, don't look for require()
		if (qq) {
			currQuote = currQuote == qq ? false : currQuote;
		}
		// if we're not inside a quoted string
		else if (!currQuote) {
			// push [relative] id into deps list and seen map
			if (!(id in seen)) {
				seen[id] = true;
				deps.push(id)
			}
		}
		return ''; // uses least RAM/CPU
	});

	return deps;
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


;define('rave/lib/legacy', ['require', 'exports', 'module'], function (require, exports, module, define) {module.exports = {
	fromLoader: function (value) {
		return value && value.__es5Module ? value.__es5Module : value;
	},
	toLoader: function (module) {
		return typeof module === 'object' ? module : {
			// for real ES6 modules to consume this module
			'default': module,
			// for modules transpiled from ES5
			__es5Module: module
		};
	}
};

});


;define('rave/pipeline/normalizeCjs', ['require', 'exports', 'module', 'rave/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

module.exports = normalizeCjs;

var reduceLeadingDots = path.reduceLeadingDots;

function normalizeCjs (name, refererName, refererUrl) {
	return reduceLeadingDots(String(name), refererName || '');
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


;define('rave/lib/metadata/crawl', ['require', 'exports', 'module', 'rave/lib/beget'], function (require, exports, module, $cram_r0, define) {var beget = $cram_r0;

module.exports = {
	processMetaFile: processMetaFile,
	processDependencies: processDependencies,
	saveDescriptor: saveDescriptor
};

function processMetaFile (context, options, pkgName) {
	var url;

	options = beget(options);

	// TODO: consider resolving this before this function executes
	if (pkgName) {
		url = options.locateMetaFile(options, pkgName);
		options.localRootPath = options.locateMetaFolder(options, pkgName);
	}
	else {
		url = options.rootUrl;
		options.localRootPath = options.rootPath;
	}

	return context.loader.import(url).then(process, notFound);

	function process (metadata) {
		// save this package's descriptor
		var pkgDesc = saveDescriptor(context, options, url, metadata);
		return processDependencies(context, options, metadata)
			.then(function (metadeps) {
				// the `|| []` guards against flawed ES6 Promise implementations
				addDeps(pkgDesc, metadeps || []);
				return pkgDesc;
			});
	}

	function addDeps (descriptor, depDescriptors) {
		var uid;
		if (!descriptor.deps) descriptor.deps = {};
		for (var i = 0; i < depDescriptors.length; i++) {
			if (depDescriptors[i]) {
				uid = options.createUid(depDescriptors[i]);
				descriptor.deps[depDescriptors[i].name] = uid;
			}
		}
	}

	function notFound (ex) {
		// the package must exist at a higher level.
		return null;
	}
}

function processDependencies (context, options, metadata) {
	var deps = metadata.dependencies, promises = [];
	for (var name in deps) {
		promises.push(processMetaFile(context, options, name));
	}
	return Promise.all(promises);
}

function saveDescriptor (context, options, url, metadata) {
	var uid, descr;

	descr = options.createDescriptor(options, url, metadata);
	uid = options.createUid(descr);

	if (!context.packages[uid]) context.packages[uid] = descr;
	if (!context.packages[descr.name]) context.packages[descr.name] = descr;

	return context.packages[uid];
}

});


;define('rave/lib/package', ['require', 'exports', 'module', 'rave/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

/**
 * @module rave/lib/package
 * Functions for CommonJS-style module packages
 */
module.exports = {

	normalizeDescriptor: normalizeDescriptor,
	normalizeCollection: normalizeCollection

};

function normalizeCollection (collection) {
	var result = {}, i, descriptor;
	if (collection && collection.length && collection[0]) {
		// array
		for (i = 0; i < collection.length; i++) {
			descriptor = normalizeDescriptor(collection[i]);
			result[descriptor.name] = descriptor;
		}
	}
	else if (collection) {
		// object hashmap
		for (i in collection) {
			descriptor = normalizeDescriptor(collection[i], i);
			result[descriptor.name] = descriptor;
		}
	}
	return result;
}

function normalizeDescriptor (thing, name) {
	var descriptor;

	descriptor = typeof thing === 'string'
		? fromString(thing)
		: fromObject(thing, name);

	if (name) descriptor.name = name; // override with hashmap key
	if (!descriptor.name) throw new Error('Package requires a name: ' + thing);
	descriptor.main = descriptor.main.replace(/\.js$/, '');
	descriptor.location = path.ensureEndSlash(descriptor.location);
	descriptor.deps = {};

	return descriptor;
}

function fromString (str) {
	var parts = str.split('/');
	return {
		main: parts.pop(),
		location: parts.join('/'),
		name: parts.pop()
	};
}

function fromObject (obj, name) {
	return {
		main: obj.main || 'main', // or index?
		location: obj.location || '',
		name: obj.name || name
	};
}

});


;define('rave/lib/createRequire', ['require', 'exports', 'module', 'rave/lib/legacy'], function (require, exports, module, $cram_r0, define) {module.exports = createRequire;

var legacy = $cram_r0;

function createRequire (loader, refId) {

	var require = function (id) { return syncRequire(id); };

	// Implement proposed require.async, just like Montage Require:
	// https://github.com/montagejs/mr, but with an added `names`
	// parameter.
	require.ensure = require.async = function (id) {
		var abs, args;
		abs = loader.normalize(id, refId);
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
		return legacy.fromLoader(value);
	}
}

});


;define('rave/lib/metadata/bower', ['require', 'exports', 'module', 'rave/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

module.exports = {
	libFolder: 'bower_components',
	locateMetaFile: locateBowerMetaFile,
	locateMetaFolder: locateBowerMetaFolder,
	createDescriptor: createBowerPackageDescriptor,
	findJsMain: findJsMain,
	findModuleType: findModuleType,
};

function locateBowerMetaFile (options, pkgName) {
	return path.joinPaths(
		locateBowerMetaFolder(options, pkgName),
		options.metaName
	);
}

function locateBowerMetaFolder (options, pkgName) {
	return path.joinPaths(
		options.rootPath,
		options.libFolder,
		pkgName || ''
	);
}

function createBowerPackageDescriptor (options, url, meta) {
	var parts, moduleType, main, descr;
	parts = path.splitDirAndFile(url);
	moduleType = findModuleType(meta);
	main = meta.main && findJsMain(meta.main);
	if (main && moduleType !== 'script') main = path.removeExt(main);
	descr = {
		name: meta.name,
		version: meta.version,
		location: parts[0],
		metaType: 'bower',
		moduleType: moduleType,
		main: main,
		metadata: meta
	};
	descr.uid = options.createUid(descr);
	return descr;
}

function findJsMain (mains) {
	if (typeof mains === 'string') return mains;
	for (var i = 0; i < mains.length; i++) {
		if (mains[i].slice(-2) === 'js') return mains[i];
	}
}

// TODO: remove matches on 'cujo' <-- HACK!
var findAmdRx = /\bamd\b|\bcujo\b/i;

function findModuleType (meta) {
	if (meta.moduleType in { amd: 1, umd: 1 }) return 'amd';
	if (meta.moduleType in { global: 1, script: 1 }) return 'script';
	if ('moduleType' in meta) return meta.moduleType;
	return (meta.name && findAmdRx.test(meta.name))
		|| (meta.description && findAmdRx.test(meta.description))
		|| (meta.keywords && (meta.keywords.indexOf('amd') >= 0 || meta.keywords.indexOf('cujo') >= 0))
		? 'amd'
		: 'script';
}

});


;define('rave/lib/nodeFactory', ['require', 'exports', 'module', 'rave/lib/legacy', 'rave/lib/createRequire'], function (require, exports, module, $cram_r0, $cram_r1, define) {module.exports = nodeFactory;

var legacy = $cram_r0;
var createRequire = $cram_r1;

var nodeEval = new Function(
	'require', 'exports', 'module', 'global',
	'eval(arguments[4]);'
);

var _global;

_global = typeof global !== 'undefined' ? global : window;

function nodeFactory (loader, load) {
	var name, source, exports, module, require;

	name = load.name;
	source = load.source;
	exports = {};
	module = { id: name, uri: load.address, exports: exports };
	require = createRequire(loader, name);

	return function () {
		// TODO: use loader.global when es6-module-loader implements it
		var exported;
		nodeEval(require, module.exports, module, _global, source);
		exported = module.exports;
		// figure out what author intended to export
		return exports === module.exports
			? exported // a set of named exports
			: legacy.toLoader(exported); // a single default export
	};
}

});


;define('rave/lib/metadata/npm', ['require', 'exports', 'module', 'rave/lib/path'], function (require, exports, module, $cram_r0, define) {var path = $cram_r0;

module.exports = {
	libFolder: 'node_modules',
	locateMetaFile: locateNpmMetaFile,
	locateMetaFolder: locateNpmMetaFolder,
	createDescriptor: createNpmPackageDescriptor
};

function locateNpmMetaFile (options, pkgName) {
	return path.joinPaths(
		locateNpmMetaFolder(options, pkgName),
		options.metaName
	);
}

function locateNpmMetaFolder (options, pkgName) {
	return path.joinPaths(
		options.localRootPath,
		options.libFolder,
		pkgName || ''
	);
}

function createNpmPackageDescriptor (options, url, meta) {
	var parts, descr;
	parts = path.splitDirAndFile(url);
	descr = {
		name: meta.name,
		version: meta.version,
		location: parts[0],
		metaType: 'npm',
		moduleType: meta.moduleType || 'node',
		main: meta.main && path.removeExt(meta.main),
		metadata: meta
	};
	descr.uid = options.createUid(descr);
	return descr;
}

});


;define('rave/pipeline/instantiateNode', ['require', 'exports', 'module', 'rave/lib/findRequires', 'rave/lib/nodeFactory', 'rave/lib/addSourceUrl'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, define) {var findRequires = $cram_r0;
var nodeFactory = $cram_r1;
var addSourceUrl = $cram_r2;

module.exports = instantiateNode;

function instantiateNode (load) {
	var loader, deps, factory;

	loader = load.metadata.rave.loader;
	deps = findRequires(load.source);

	// if debugging, add sourceURL
	if (load.metadata.rave.debug) {
		load.source = addSourceUrl(load.address, load.source);
	}

	factory = nodeFactory(loader, load);

	return {
		deps: deps,
		execute: function () {
			return new Module(factory.apply(this, arguments));
		}
	};
}

});


;define('rave/lib/metadata', ['require', 'exports', 'module', 'rave/lib/path', 'rave/lib/beget', 'rave/lib/metadata/crawl', 'rave/lib/metadata/bower', 'rave/lib/metadata/npm'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, define) {var path = $cram_r0;
var beget = $cram_r1;

var crawl = $cram_r2;
var bowerOptions = $cram_r3;
var npmOptions = $cram_r4;

var metaNameToOptions = {
	'bower.json': bowerOptions,
	'package.json': npmOptions
};

module.exports = {
	crawl: crawlStart,
	findPackage: findPackageDescriptor,
	findDepPackage: findDependentPackage,
	createUid: createUid,
	parseUid: parseUid
};

function crawlStart (context, rootUrl) {
	var parts, metaName, metaOptions, options;

	parts = path.splitDirAndFile(rootUrl);
	metaName = parts[1];
	metaOptions = metaNameToOptions[metaName];

	if (!metaOptions) throw new Error('Unknown metadata file: ' + rootUrl);

	options = beget(metaOptions);

	options.metaName = metaName;
	options.rootPath = parts[0];
	options.rootUrl = rootUrl;
	options.createUid = createUid;

	return crawl.processMetaFile(context, options, '');
}

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

});


;define('rave/pipeline/locatePackage', ['require', 'exports', 'module', 'rave/lib/path', 'rave/lib/metadata'], function (require, exports, module, $cram_r0, $cram_r1, define) {module.exports = locatePackage;

var path = $cram_r0;
var metadata = $cram_r1;

function locatePackage (load) {
	var options, parts, packageName, modulePath, moduleName, descriptor,
		location, ext;

	options = load.metadata.rave;

	if (!options.packages) throw new Error('Packages not provided: ' + load.name);

	parts = metadata.parseUid(load.name);
	packageName = parts.pkgUid || parts.pkgName;
	modulePath = parts.modulePath;

	descriptor = options.packages[packageName];
	if (!descriptor) throw new Error('Package not found: ' + load.name);

	moduleName = modulePath || descriptor.main;
	location = descriptor.location;
	ext = options.defaultExt || '.js';

	// prepend baseUrl
	if (!path.isAbsUrl(location) && options.baseUrl) {
		location = path.joinPaths(options.baseUrl, location);
	}

	return path.joinPaths(location, path.ensureExt(moduleName, ext));
}

});


;define('rave/src/pipeline', ['require', 'exports', 'module', 'rave/pipeline/normalizeCjs', 'rave/pipeline/locatePackage', 'rave/pipeline/locateAsIs', 'rave/pipeline/fetchAsText', 'rave/pipeline/translateAsIs', 'rave/pipeline/translateWrapInNode', 'rave/pipeline/instantiateNode', 'rave/lib/overrideIf', 'rave/lib/createFileExtFilter', 'rave/lib/package', 'rave/lib/beget'], function (require, exports, module, $cram_r0, $cram_r1, $cram_r2, $cram_r3, $cram_r4, $cram_r5, $cram_r6, $cram_r7, $cram_r8, $cram_r9, $cram_r10, define) {var normalizeCjs = $cram_r0;
var locatePackage = $cram_r1;
var locateAsIs = $cram_r2;
var fetchAsText = $cram_r3;
var translateAsIs = $cram_r4;
var translateWrapInNode = $cram_r5;
var instantiateNode = $cram_r6;
var overrideIf = $cram_r7;
var createFileExtFilter = $cram_r8;
var pkg = $cram_r9;
var beget = $cram_r10;

module.exports = _ravePipeline;

function _ravePipeline (context) {
	var modulePipeline, jsonPipeline;

	context = beget(context);
	if (context.packages) {
		context.packages = pkg.normalizeCollection(context.packages);
	}

	modulePipeline = {
		normalize: normalizeCjs,
		locate: withContext(context, locatePackage),
		fetch: fetchAsText,
		translate: translateAsIs,
		instantiate: instantiateNode
	};

	jsonPipeline = {
		normalize: normalizeCjs,
		locate: withContext(context, locateAsIs),
		fetch: fetchAsText,
		translate: translateWrapInNode,
		instantiate: instantiateNode
	};

	return {
		applyTo: function (loader) {
			overrideIf(createRavePredicate(context), loader, modulePipeline);
			overrideIf(createFileExtFilter('json'), loader, jsonPipeline);
		}
	};
}

function createRavePredicate (context) {
	return function (arg) {
		var moduleId, packageId;
		// Pipeline functions typically receive an object with a normalized name,
		// but the normalize function takes an unnormalized name and a normalized
		// referrer name.
		moduleId = typeof arg === 'object' ? arg.name : arg;
		// check if this is the rave-main module
		if (moduleId === context.raveMain) return true;
		if (moduleId.charAt(0) === '.') moduleId = arguments[1];
		packageId = moduleId.split('/')[0];
		return packageId === 'rave';
	};
}

function withContext (context, func) {
	return function (load) {
		load.metadata.rave = context;
		return func.call(this, load);
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
