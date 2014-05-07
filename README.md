# RaveJS

┏( ˆ◡ˆ)┛ ┗(ˆ◡ˆ )┓ RaveJS rocks! ┏( ˆ◡ˆ)┛ ┗(ˆ◡ˆ )┓

## What is RaveJS?

RaveJS eliminates configuration, machinery, and complexity.  Stop
configuring and tweaking complicated machinery such as file watchers,
minifiers, and transpilers just to get to a runnable app.  Instead, go
from zero to "hello world" in 30 seconds.  In the next 30 seconds, easily
add capabilities and frameworks to your application simply by installing
*Rave Extension* and *Rave Starter* packages from
[npm](//www.npmjs.org/search?q=rave-extension) and
[Bower](//bower.io/search/?q=rave-extension). Finally, install additional
*Rave Extension* packages to apply your favorite build, deploy, and testing
patterns.

## Why should I use RaveJS?

-	Less machinery, configuration, and maintenance
-	Brain-dead simple project start-up
	-	Modern, modular architectures are simple, too!
-	Huge selection of packages on npm and Bower
-	ES6 Loader polyfill is built in
-	Platform for integration and customization
-	Create easy-to-understand demos and tutorials
-	Super fast prototyping


## Does RaveJS require a PhD in Rocket Science?

No.  If you can do `npm install` or `bower install` and if you can add
a single script element to an HTML page, you can master RaveJS!

RaveJS is the absolute easiest way to get started with modules.  Author AMD,
CommonJS, or (soon) ES6 modules without transpiling, build steps, or secret
incantations.


## How does it work?

RaveJS uses the metadata *you're already generating* when you use JavaScript
package managers such as [npm](//npmjs.org) and [Bower](//bower.io).
RaveJS moves the configuration task to package authors and integrators.
Package authors already create metadata when they wish to publish their
packages to npm and Bower.  RaveJS uses the metadata in package.json and
bower.json to auto-configure an ES6 Loader (or Loader shim) so there's no
messy AMD config or browserify build process.

RaveJS Extensions allow third parties to provide new capabilities
to RaveJS or to your application.  Install the extensions you desire easily
through npm (`npm install --save <name-of-rave-extension>`) or Bower
(`bower install --save <name-of-rave-extension>`).

RaveJS Extensions do many things:

- Auto-configure your application's loading patterns
- Auto-configure your application's build patterns (soon)
- Auto-configure your application's deployment patterns (soon)
- Auto-configure your application's testing patterns (target: summer/fall 2014)
- Integrate third-party packages into your application by supplying additional
  metadata or glue code

RaveJS extensions are easy to create and easy to find on npm and
Bower by searching for "[rave-extension](https://www.npmjs.org/search?q=rave-extension)".


## Does it scale?

Yes. RaveJS easily scales to applications containing hundreds of modules
from dozens of third-party packages.  It doesn't matter if those packages
are available on npm or Bower -- or whether they're authored in AMD, CommonJS,
or (soon) ES6 format.  RaveJS makes it all work seamlessly.


## How do I start?

Check out the [Quick Start using Bower](./docs/quick-start-bower.md)
and the [Quick Start using npm](./docs/quick-start-npm.md).

Check the [docs/ folder](./docs/) for more information.

## Why do I see 404s?

404s are ok during development.  These won't occur in production. You can
[eliminate 404s](./docs/404s.md) during development easily, too, if desired.


## About

RaveJS is brought to you by [cujoJS](http://cujojs.com).
