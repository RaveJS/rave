# Debugging

As of version 0.4.0, debugging is on by default.  Rave, itself, is always
in "debug mode" until bundled for production.  To ensure that rave
extensions also turn on debugging by default, rave sets the "debug"
environment property to true. You can turn off debugging for extensions
by modifying or adding a rave env property with the value `false` in your
bower.json or package.json metadata file.  See the next section.

## Fine-grained debugging

Most rave extensions and third-party, RaveJS-aware packages have additional
debug settings.  These are typically turned on or off with an additional
rave env property. For instance, the following snippet of a
metadata file will turn off debugging for everything except for wire:

```json
{
"rave": {
	"env": {
		"debug": false,
		"wire": {
			"debug": true
		}
	}
}
}
```

# Insight into rave at run time

Rave creates a global `rave` function that exposes REPL-like commands
in your browser's debugging console.

Open your browser's console for more information.
