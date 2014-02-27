# RaveJS

## What is RaveJS?

RaveJS is next-generation modular architecture, today.  RaveJS
is designed on EcmaScript and *de facto* standards.  It's open and
is designed to integrate with *everything*.

## Do I need a PhD in Computer Science to use RaveJS?

No.  If you can do `npm install` or `bower install` and if you can add
a single script element to an HTML page, you can master RaveJS!

## How do I start?

First, create a folder your your app:

```bash
mkdir myApp
cd myApp
```

Initialize the app to use either npm or bower:

```bash
npm init
```

or

```bash
bower init
```

Be sure to provide a `name` and an `entry point`/`main`.  The `entry point`
is the `main` module of your application and bootstraps your app.  npm
defaults to "index.js", but "main" or "main.js" are obvious names.
(The file extension is allowed, but not recommended.)

Just hit enter to accept the default values for the other questions if
you are not sure how to answer.

Next, install RaveJS:

```bash
npm install --save rave
```

or

```bash
bower install --save rave
```

Now, create an index.html file.  This is enough code to get started:

```html
<!doctype html>
<html data-debug>
<head>
<script src="node_modules/rave/rave.js" async></script>
</head>
</html>
```

If you're using bower, set the script element's `src` attribute to
"bower_components/rave/rave.js".  Note the `debug` attribute on the
`html` element.  This will turn on debugging features while you develop
your application.

Lastly, create the `main` module.  If you chose to use npm, this module
should be in the CommonJS/node format.  If you chose bower, this module
should be an AMD-formatted module.  (You can change the format by adding
`"moduleType": "node"` or `"moduleType": "amd"` to your `package.json`
or `bower.json` file.)  Here's a simple `main` module to get you started:

```js
exports.main = function (context) {
	write('<h1>Welcome to RaveJS!</h1>');
	write('<h2>Congrats on your first RaveJS app, "' + context.app.name + '"!</h2>');
};
function write (msg) {
	document.body.appendChild(document.createElement('div')).innerHTML = msg;
}
```

For AMD, just wrap the module in a `define`:

```js
define(function (require, exports) {
exports.main = function (context) {
	write('<h1>Welcome to RaveJS!</h1>');
	write('<h2>Congrats on your first RaveJS app, "' + context.app.name + '"!</h2>');
};
function write (msg) {
	document.body.appendChild(document.createElement('div')).innerHTML = msg;
}
});
```

Launch your favorite web server and open the index.html page in a browser.
