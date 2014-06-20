# Developing apps with rave

The primary goal of RaveJS is to make it amazingly simple to create
sophisticated, modern web apps.  To help you achieve this, we ask only
three things of you:

1.	Use bower and npm to manage your application and all of its third-party
	libraries and frameworks.
2.	Save all bower and npm metadata by specifying the `--save` command
	line flag.
3.	Use Rave Starters, Rave Extensions, and Rave Integration packages to
	integrate with frameworks and add capabilities.

> **Why bower and npm?**

Package managers provide a consistent environment.  Rave relies on the
package manager to put predictable files into well-known locations.

> **Why save the metadata?**

Metadata allows rave to automatically discover the installed packages, discover
their details, and respond accordingly *with no configuration* and *with
no machinery*.

> **Why use Rave Starters, Rave Extensions, and Rave Integration packages?**

These rave-specific packages provide community-driven patterns, capabilities,
and conveniences that preserve Rave's goals to eliminate configuration
and machinery.

Since rave-specific packages don't require any code changes to your code or
to third-party frameworks and libraries, you are free to uninstall them,
replace them with an alternative, or *roll your own* at any time.


## Getting started

To get started with Rave, you need to have the following, typical web
development tools pre-installed:

1.	a recent release of [node.js](http://nodejs.org/download/)
2.	a recent release of [bower](http://bower.io/) and/or npm (comes with
	node.js)
3.	any static web server, such as
	[Spring Boot](http://projects.spring.io/spring-boot/),
	[express](http://expressjs.com), or [serv](https://github.com/scothis/serv)
	(some Rave Starters already come with a web server)

### From a Rave Starter

For a minimally-opinionated Starter,
[begin here](http://github.com/RaveJS/rave-start).

For an AngularJS-centric starter,
[begin here](http://github.com/RaveJS/rave-start-angular).

Don't see a Starter for your favorite stack?  Create one!

### From scratch

Check out [Quick Start using Bower](./quick-start-bower.md)
or [Quick Start using npm](./quick-start-npm.md).


## The development process

### Authoring your app's modules

Rave uses the metadata in the top-level bower.json or package.json files
to create a package for your application's modules.  The specifics of this
package depend on the Rave Starter you use or the name and moduleType
you choose if you start [from scratch](#from-scratch).

Many Rave Starters call the application package, "app", which means your app's
modules will reside in the "app/" module namespace and the "app/" directory
under the web root.

How you build your application depends on which frameworks and libraries
you have chosen, of course.  However, the format in which you author your
modules -- AMD, node, or ES6 -- does *not* depend on the frameworks.  Every
package, including the framework packages and your app's package, may have
a different format.  Pick your favorite format for your app’s modules,
but be consistent.  Rave won’t mix-and-match formats within a package.

In short, pick your favorite format for all of your app's modules.

AMD, node, and ES6 use module naming semantics that mimic unix-style file
paths and urls.  Therefore, your module namespaces will mirror your directory
structures.  For instance, if you have partitioned your app into three
components named "home", "settings", and "detail", your modules should be
organized into three sub-spaces: "app/home/", "app/settings/", and "app/detail".
These will naturally reside in similarly named directories:

```
app
 + detail
 + home
 + settings
```

When referencing modules from within your application, use relative names.
When referencing modules in other packages, always use absolute names!
For example, the following code illustrates how to import a sibling module,
called "controller" (within your app) and a third-party module, named
"when/function", that resides in a third-party package.

```js
var controller = require('./controller'); // relative name
var fn = require('when/function'); // absolute name
```

For a more complete introduction to JavaScript modules, check out the
[Learning modules series](http://know.cujojs.com/tutorials) on
[know.cujojs.com](http://know.cujojs.com).


### Extending your app

You can extend the capabilities of your app at any time by adding *Rave
Extensions*.  *Rave Extensions* add capabilities and *glue code* that may be
needed by your favorite framework or library.

Before installing a framework or library, first check if there are any *Rave
Extensions* for it.  The *Rave Extension* may patch a metadata problem,
integrate commonly combined libraries, or just make it easier to use.

*Rave Extensions* can be found by searching for "rave-extension" on
[bower](http://bower.io/search/?q=rave-extension) or
[npm](http://www.npmjs.org/search?q=rave-extension).

**When installing Rave Extensions or any other packages,
don't forget to use the `--save` option when installing!**


### Running your app

By default, your app requires only a static web server to run.  Stand up a
web server that can serve the directory where your app's bower.json
or package.json file reside.  Then, point your favorite browser at the url
for this directory.

For instance, if you're using the tiny web server
[serv](https://www.npmjs.org/package/serv), your application resides in the
`projects/myApp` folder, and you would like to serve files over port 8080,
type:

```bash
cd projects/myApp
serv 8080
```

Then open your browser to http://locahost:8080.

**You don't have to configure transpilers, file watchers, build tools, etc.**
Your application configures and assembles itself from the metadata and source
code it discovers in the directories under the web root.

We call this *responsive mode* since your application responds automatically
to any changes in the metadata or application code.  Just reload the browser
and the application is up to date.


### Debugging your app

By default, your application runs in *quiet mode*.  However, it's super
easy to turn on *debug mode*.  Simply add a "data-debug" attribute to the
`<html>` tag in your HTML.  *Debug mode* turns on many useful features, logs
more exceptions, and checks for common mistakes.

Most Rave Starters are configured for *debug mode* out of the box.

You'll typically want to switch back to *quiet mode* before deploying your
application to production, of course.

Learn more about debugging in the [debugging](./debugging.md) document.

> **Note**: *quiet mode* and *debug mode* are mutually exclusive, of course,
but they can both be used in conjunction with *responsive mode* or *built mode*
(see [below](#building your app)).

### Building your app

When in *responsive mode*, lots of computation happens at run time in the
browser.  This is hardly perceptible most of the time when running on your
development machine.  However, this mode is totally unacceptable in production.
Eventually, you must build your app.

Switching to *built mode* is just a single command (TBD: Summer 2014).
Virtually all of the run-time computation that was happening in the browser
is pre-computed during the build process.  Your app is leaner, faster,
and closer to what will be deployed to production.

However, now your development environment is more complicated.  Unlike in
*responsive mode*, the compiling, transforming, and concatenation must happen
before the code arrives at the browser.  Fortunately, Rave and Rave Extensions
automatically configure compilers, transformers, concatenators, minifiers,
file watchers, etc.  You don't need to do this manually!

*Built mode* is not a one-way street.  Go back to the simplicity of
*responsive mode* at any time with a single command (TBD: Summer 2014).

More importantly, you can control how your app is built.  Rave Starters come
with an opinionated set of build tools, but you can uninstall any of them
and replace them with Rave Extensions for the build tools that assemble
your application the way you prefer.

Don't like SASS? Install a Rave Extension that supports LESS or Stylus or
pure OOCSS instead.


### Testing your app

Testing isn't easy, **but it should be**.  We plan to simplify your testing
process, too: unit testing, functional testing, continuous integration,
even TDD strategies.

Want to integrate [buster.js](http://busterjs.org) with
[Sauce Labs](http://saucelabs.com/)?  Install a Rave Extension for that combo.

We're aiming for the end of 2014.  Stay tuned!


### Deploying your app

Once you've coded, built, and tested your app.  It's time to deploy it.
Deployment should be brain-dead simple.  Install a Rave Extension to deploy
to Cloud Foundry or Heroku, for instance.

As with [testing](#testing-your-app), we're aiming for the end of 2014 for
this functionality.  Can't wait?  Help us out!
