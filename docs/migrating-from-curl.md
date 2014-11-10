# Migrating from curl.js

Rave Starters make it super easy to start a new front-end web application with rave.  However, adapting an existing app over to rave takes a bit more effort.  This document will step you through the process of adapting your current curl+cram project to RaveJS.  

> This document is a work in progress.  Your feedback and suggestions are greatly appreciated.

## Survey your current app

Before you start deleting, modifying, or moving files, assemble a list of all of your front-end app's third-party dependencies.  The first place to look for dependencies is in your app's bootstrap code.  For curl-based projects, look in the `paths` and `packages` sections of your curl.js configuration.  

You should record the version numbers of your third-party dependencies, if possible.  If you use bower or npm and installed using the `--save` option, the version numbers are in your package.json or bower.json files.  

Bower and npm install transitive dependencies.  Npm puts them in nested `node_modules` directories.  Bower puts them in the top-level `bower_components` directory.  Don't record the names and versions of these transitive dependencies.  Just record the names and versions of the packages that your app depends on *directly*.  

Lastly, check for global scripts you may have added to HTML documents.  Rave handles global scripts, too.

Now that you've successfully recorded all of your third-party dependencies,  delete them from your file system.  Yes.  Do it.  Delete your `bower_components`, `node_modules`, and/or any other  directories where you keep your third-party libraries.  

From now on, you will trust a package manager to install and manage your third-party package dependencies.  But first, let's take a look at your application...

## Unify your app's module space

Unlike AMD, which isn't prescriptive about the structure of your application, Rave requires that all of your application code reside under a single package -- a single namespace.  So, if your app is named "awesome", then your app's modules must be named "awesome/main", "awesome/widgets/coolWidget", "awesome/theme/base.css", etc.

In AMD, it's easy to partition your app into multiple top-level namespaces.  You can configure multiple `paths` or `packages` that map names to arbitrary paths within your application's file structure.  

For instance, if you previously configured an AMD path or package for a "coolWidget" component and a "theme" set of stylesheets, then you could configure and import them like this:

```js
// configure packages
curl.config({
	packages: {
		coolWidget: 'awesome/widgets/coolWidget',
		theme: 'awesome/theme'
	}
});

// later, in a module...

define(['coolWidget', 'css!theme/base.css'], function (widget, themeSS) {
	// do something
});
```

When updating to rave, you will need to move myCoolWidget and theme.css into your app's namespace.  From the "Awesome/main" module, you would import them as follows:

```js
/** @module: awesome/main */
define(['./widgets/coolWidget/main', 'css!./theme/base.css'], function (widget, themeSS) {
	// do something
});
```

Notice the use of *relative ids*.  Since relative ids are resolved relative to the current module, the resulting ids will be normalized to your app's namespace.  Following the "awesome" example above, the module ids would normalize to "awesome/widgets/coolWidget/main" and "css!awesome/theme/base.css".

> Confused about when to use relative module ids versus absolute ids?  The general rule is:
>
> **Use relative ids when importing modules from the same package.**  
> **Use absolute ids when importing modules from other packages.**

## Choose a package manager

Rave works with the two most popular JavaScript package managers: npm and bower.  Npm is more mature and offers more packages, but many of the packages were designed to only run under node.js.  Bower, on the other hand, was created to manage browser-centric packages.

Perhaps it's best to search both npm and bower for your third-party dependencies before deciding which one to use.  It's also possible to use packages from both simultaneously, but you may need to work around a few edge cases.

Once you've picked a package manager, install it. Npm is automatically installed when you install [node](http://nodejs.org/download/).  Bower is easy to [install](http://bower.io/#install-bower) once you've installed node.

> For the rest of this document, we'll show examples for npm, but the bower commands and output are very similar.  If you are using bower, wherever you see `npm` or "package.json", substitute `bower` or "bower.json".

First, determine which directory will be the root directory for your application's modules.  *This directory must be accessible from a web browser.*

`cd` to the root directory and type `npm init` (or `bower init`).  You'll be asked a few questions, which will be used to generate a top-level package.json file (bower.json file).  If you already have a package.json file (bower.json file), the `init` command will modify it.

Be sure to provide meaningful values for the following properties:

* `name` -- this must precisely match your app's namespace
* `version` -- 2.0.0, for instance
* `main` -- the relative path to the main entry point of your app, typically "main.js"
* `moduleType` -- (bower only) choose "amd" or "node"

If your app doesn't already have a main entry point, create a new file in your root directory and call it "main.js" for now.  Later, you will move any startup code from your run.js or HTML files into "main.js".

## Install third-party dependencies

Now that you have a top-level package.json file (or bower.json), you will use it to track your third-party dependencies.

First, find an appropriate package for your dependency.  To search for a list of packages, use `npm search [search terms]` or go to [npmjs.org](https://www.npmjs.org/) ([bower.io/search](http://bower.io/search/)).  There may be multiple packages listed for your dependency.  It's your job to ensure that you pick the one that most closely matches your requirements and philosophies.  Do your research!

To install a package, type:

```bash
npm install --save <package_name>@<version_no>
```

If you want to install the latest release, skip the "@" and the version number.  (Note: bower uses the "#" symbol instead of the "@" symbol.)

**Always use the `--save` option when installing or uninstalling packages!**  This ensures that the package's name and version are saved to your top-level package.json file.  Rave uses this info to assemble your application correctly.

If the dependency isn't listed in the npm (or bower) directory, it still might be possible to use it.  Consult the command line instructions for more info: `npm help install` or `bower help install`.  You could consider authoring and publishing your own package to npm or bower, as well.

## Move bootstrap code

### Startup code

If your curl configuration used a "main" property to bootstrap your app, then simply ensure that the "main" property in your package.json (or bower.json) file points to the same file, your app's *main entry point*.  In rave, the main entry point is a module, often called the *main module*.

On the other hand, if your app used startup code in a callback passed to `curl()` or to the `.then()` or `.next()` API functions, you will need to move the code to the main module.  

For instance, if your curl bootstrap code looked like this:

```js
curl.config({ /*...*/ });
curl(['a', 'b']).then(function (a, b) {
	// startup code: do something with a and b
});
```

The startup code and the dependency list should be moved to the main module as follows:

```js
define(['a', 'b'], function (a, b) {
	// startup code: do something with a and b
});
```

The `.next()` API function was typically used to work around implicit dependencies between packages/libraries.  Well-formed npm and bower packages don't have implicit dependencies, so this type of functionality is no longer needed.  Instead, just load the modules you intend to use.  

For instance, the following curl.js code preloads "jQuery" before loading and using "jqPlugin" to bootstrap the app:

```js
// jqPlugin implicitly relies on jQuery, so we preload it
curl(['jQuery']).next(['jqPlugin']).then(function ($) {
	// startup code
});
```

Remove the explicit preload of jQuery in the main module:

```js
define(['jqPlugin']).then(function ($) {
	// startup code
});
```

### Preloads

The other way to ensure that certain modules are loaded first in curl.js is the `preloads` configuration property.  Except for polyfills and shims, it's not necessary to preload modules in rave.  Polyfills and shims should either be loaded via a `<script>` tag or in a custom "boot.js" (next section).

## Bootstrap

After you have moved your startup logic to a main module, delete any `<script>` tags that load curl or that contain curl configuration.  Delete any "run.js" file, too.  

There are two ways to bootstrap a rave app:

* load "rave.js" directly with a `<script>` tag
* use an async bootstrap file ("boot.js")

### Direct

To load "rave.js" directly, use the following HTML:

```html
<script async src="node_modules/rave/rave.js"></script>
```

### boot.js

The main benefit of a "boot.js" file is to eliminate potentially messy *HTML rewriting* at build time.  The [rave-start](https://github.com/RaveJS/rave-start/) starter project contains a simple "boot.js" that you can copy into your project:

* npm-based "boot.js": https://github.com/RaveJS/rave-start/blob/npm-only/boot.js
* bower-based "boot.js": https://github.com/RaveJS/rave-start/blob/master/boot.js

Add a "boot.js" `<script>` as follows:

```html
<script async src="boot.js"></script>
```

## Migrate curl plugins

### ES6 loader hooks

The preferred way to load resources, such as CSS, HTML templates, or JSON, in rave is via ES6 loader hooks.  The following are some examples of Rave Extensions that add loader hooks:

* CSS - `npm install --save rave-load-css`
* Text - `npm install --save rave-load-text`
* JSON - `npm install --save rave-load-json`
* JSX - `npm install --save rave-load-jsx`

These extensions don't require devs to use AMD plugin syntax.  Instead, they instruct the loader to look for specific file extensions.  For instance, the rave-load-css extension tells the loader that it handles things that have ".css" file extensions.  

In the long term, you should convert your use of AMD plugin syntax to file extensions, for example:

```js
// from this
define(['json!./config.json', 'text!./base.html'], function (json, template) {
	// do something
});
```

```js
// to this
define(['./config.json', './base.html'], function (json, template) {
	// do something
});
```

### domReady

There is no ES6 loader hook equivalent to the "domReady!" plugin.  However, you can install the "domready" callback module instead:

```bash
npm install --save domready
```

It works a bit differently from "domReady!", requiring an additional callback function:

```js
define(['domready'], function (domready) {
	domready(function () {
		// the dom is ready for manipulation here
	});
});
```

### AMD plugin syntax

For your convenience over the short term, most of the curl plugins have been adapted to work in rave.  These extensions extend the ES6 loader to understand AMD plugin syntax:

* text! - `npm install --save rave-load-text`
* css! - `npm install --save rave-load-css`
* json! - `npm install --save rave-load-json`
* domReady! - `npm install --save rave-load-domready`
* i18n! - `npm install --save rave-load-i18n`
* link! - `npm install --save rave-load-link`
* js! - `npm install --save rave-load-js`

## Migrate curl loaders

Since rave already handles node-formatted modules and CommonJS modules, you don't need to use special configuration or adapters  such as curl.js's "curl/loader/cjsm11" loader.  

Similarly, rave handles global scripts without special adapters.  However, unlike curl's "curl/loader/legacy" loader, if a script declares global variables, rave doesn't insert them into the loader's registry.  In effect, this means you can no longer access global scripts as if they were modules, as follows:

```js
define(['myGlobalLibrary'], function (myGlobalLib) {
	myGlobalLib.foo(); // throws "undefined is not a function"
})
```

You can, however, access global variables on the `window` object (as well as on the `global` object in node-formatted modules):

```js
define(['myGlobalLibrary'], function () {
	var myGlobalLib = window.myGlobalLib;
	myGlobalLib.foo(); // succeeds
})
```

## Test-run your app

At this point, you should be able to run your application.  Go ahead and try it.  Be sure to open the browser console, of course.  If you get nothing but 404s, check that the `<script>` url paths are correct, as usual.  Also, check that your package.json is accessible to the browser, and that its "main" property is correct.

One of the most common errors is to forget to specify `--save` when installing packages.  Continue on to the [debugging](./debugging.md) document for further help.
