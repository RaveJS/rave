# RaveJS

┏( ˆ◡ˆ)┛ ┗(ˆ◡ˆ )┓ RaveJS rocks! ┏( ˆ◡ˆ)┛ ┗(ˆ◡ˆ )┓

> **Note**: RaveJS is still under development.  You can run your apps in
*dev mode*, but you cannot build your application for production, yet.
Please give it a try, though, and let us know what you think.
Or check out the open issues, if you'd like to contribute.

## What is RaveJS?

Rave eliminates configuration, machinery, and complexity.  Stop configuring
and tweaking module loaders, file watchers, minifiers, and transpilers just
to get to a runnable app. Instead, go from zero to "hello world" in less
than 30 seconds. In the next 30 seconds, use npm or Bower to install your
favorite frameworks and libraries.  Start coding instantly *without configuring
anything*.

With the help of *Rave Extensions*:

* Extend the module loader to load CSS, templates, JSON, JSX, etc.
* Use gulp or grunt plugins to build your app for production
* Integrate with your favorite testing framework

Again, with zero configuration in most cases.


Rave incorporates an ES6-style loader that **auto-detects** module format,
allowing you to intermix packages authored in AMD, node, and (soon) ES6
formats.  It also easily loads JSON, CSS, JSX, text, or virtually any other
format just by installing a Rave Extension.

Rave **auto-detects** your project's packages regardless of whether you
installed them via Bower or npm.  There's no need to configure a loader
or create an application manifest file.

*In progress:* rave also intelligently and effortlessly builds your app
according to your preferences by inspecting the gulp or grunt plugins
you've installed.

*In progress:* Rave provides a smart command-line tool that you can
*optionally* use to simplify tasks and reduce common errors.  Rave CLI doesn't
replace the tools you already love, such as `bower` or `npm`, `gulp` or
`grunt`. Rave CLI just makes them much easier to use in a rave app.


## Why should I use RaveJS?

-	Requires zero machinery or configuration to get started and zero ongoing
	maintenance
-	Enables brain-dead simple project startup
	-	Modern, modular architectures are simple, too!
-	Offers huge selections of packages from npm and Bower
-   Provides a platform for third-party integration
-	Embraces the future: an ES6 Loader polyfill is built in
-	Creates easy-to-follow demos, tutorials, and prototypes


## Does RaveJS require a PhD in Rocket Science?

No.  If you can do `npm install` or `bower install` and if you can add
a single script element to an HTML page, you can master Rave!  If that's
too much work, clone a *Rave Starter* for a head start.

Rave is the absolute easiest way to get started with modules.  Author AMD,
CommonJS, or (soon) ES6 modules without futzing with transpilers, file watchers,
or complex build scripts.


## How do I start?

Jump straight to the [Getting started](./docs/developing.md#getting-started)
section of the [Developing apps with rave](./docs/developing.md) guide.

Check the [docs/ folder](./docs/) for more information.


## How does it work?

Rave uses the metadata *you're already aggregating* when you use JavaScript
package managers such as [npm](http://npmjs.org) and [Bower](http://bower.io).
This moves the configuration burden from you, the application developer,
to package authors.

Package authors already create metadata when they publish their
packages to npm and Bower.  Rave uses the metadata in package.json and
bower.json to auto-configure an ES6 Loader (or Loader shim) so there's no
messy AMD config or browserify build process.  (Soon) Rave will use
metadata to automate the build/deploy and testing processes, too.

Rave Extensions allow third parties to provide new capabilities
to Rave or to your application.  Install the extensions you desire easily
through npm (`npm install --save <name-of-rave-extension>`) or Bower
(`bower install --save <name-of-rave-extension>`).

Rave Extensions do many things:

- Auto-configure your application's loading patterns
- Auto-configure your application's build patterns (soon)
- Auto-configure your application's deployment patterns (TBD: end of 2014)
- Auto-configure your application's testing patterns (TBD: end of 2014)
- Integrate third-party packages into your application by supplying additional
  metadata or glue code

Rave extensions are easy to create and easy to find on npm and Bower by
searching for "[rave-extension](http://www.npmjs.org/search?q=rave-extension)".


## About

RaveJS is one of the many stand-alone components of
[cujoJS](http://cujojs.com), the JavaScript Architectural Toolkit.
