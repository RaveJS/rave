## Using AngularJS with Rave

AngularJS implements its own flavor of modules.  However, its modules don't
coordinate with any kind of loader mechanism.  This means you must use another
module system (or script loader) in conjunction with angular modules.  Rave
will load angular modules if they have been formatted as node modules or
as AMD modules.


### rave-angular

The [rave-angular](https://github.com/unscriptable/rave-angular) extension
provides basic support for using angular modules inside AMD or node modules.
It copies the `angular` global and the `ngRoute` angular module into
the ES6 Loader's registry so you can import them in the usual way.

For instance, you can use the familiar `require()` syntax from AMD or node
modules:

```js
var angular = require('angular');
var ngRoute = require('angular-route');
```

To install rave-angular from bower:

```bash
bower install --save rave-angular
```

See the [rave-angular](https://github.com/unscriptable/rave-angular) docs
for more information.


### rave-start-angular

The [rave-start-angular](https://github.com/ravejs/rave-start-angular)
project makes it super easy to get started.  It's a "hello world" app built
with [rave-angular](#rave-angular).


### Manual installation

Of course, you can install AngularJS manually via bower or npm*.  To install
the "angular" bower package, just type the following from your project's
root:

```bash
bower install --save angular
```

Installing the "angular" package on npm is similar:

```bash
npm install --save angular
```

Be sure to initialize your package manager via `bower init` or `npm init`
before installing and *always* specify `--save` as shown above.

\* As of rave 0.2.0.
