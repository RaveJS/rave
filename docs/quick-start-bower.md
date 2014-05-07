## Quick start using Bower

First, create a folder for your app:

```bash
mkdir myApp
cd myApp
```

Initialize the app to use Bower:

```bash
bower init
```

Be sure to provide a `name` and a `entry point`.  "main.js" is a good name to
use.  Just hit enter to accept the default values for the other questions if
you are not sure how to answer.

Next, install RaveJS:

```bash
bower install --save rave
```

Now, create an index.html file.  This is enough code to get started:

```html
<!doctype html>
<html data-rave-meta="bower.json" data-debug>
<head>
<script src="bower_components/rave/rave.js" async></script>
</head>
</html>
```

The `data-rave-meta="bower.json"` and `data-debug` attributes are optional,
but are a good starting point until you fully understand how RaveJS works.

Lastly, create the main module.  When using Bower, AMD is the default
module format.  Here's a simple main module to get you started:

```js
define(function (require, exports) {
exports.main = function (context) {
	write('<h1>Welcome to RaveJS!</h1>');
	write('<h2>Congrats on your first RaveJS app: "' + context.app.name + '"!</h2>');
};
function write (msg) {
	document.body.appendChild(document.createElement('div')).innerHTML = msg;
}
});
```

That's it! No file watchers, no build steps, and no transpiling.
Just launch your favorite web server and open the index.html page
in a browser.
