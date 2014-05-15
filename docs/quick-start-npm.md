## Quick start using NPM

First, create a folder for your app:

```bash
mkdir myApp
cd myApp
```

Initialize the app to use npm:

```bash
npm init
```

Be sure to provide a `name` and an `entry point`.  The *entry point* is
the name of your *main module*.  "main.js" is a good name to
use.  Just hit enter to accept the default values for the other questions if
you are not sure how to answer.

Next, install RaveJS:

```bash
npm install --save rave
```

Now, create an index.html file.  This is enough code to get started:

```html
<!doctype html>
<html data-rave-meta="package.json" data-debug>
<head>
<script src="node_modules/rave/rave.js" async></script>
</head>
</html>
```

The `data-rave-meta="package.json"` and `data-debug` attributes are optional,
but are a good starting point until you fully understand how RaveJS works.

Lastly, create the main module.  When using npm, CommonJS is the default
module format.  Here's a simple main module to get you started:

```js
exports.main = function (context) {
	write('<h1>Welcome to RaveJS!</h1>');
	write('<h2>Congrats on your first RaveJS app: "' + context.app.name + '"!</h2>');
};
function write (msg) {
	document.body.appendChild(document.createElement('div')).innerHTML = msg;
}
```

That's it! No file watchers, no build steps, and no transpiling.
Just launch your favorite web server and open the index.html page
in a browser.

Now, go find some useful
[Rave Extensions](http://www.npmjs.org/search?q=rave-extension) to install.
Don't forget to use `--save` when you `npm install --save <extension>`!
