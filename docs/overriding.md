## Overriding metadata

Rave uses several heuristics to determine the best way to handle bower and
npm packages, but once in a while, it doesn't make the right decision.  You
can provide the correct information to rave by overriding the metadata in
these misunderstood packages.

The following features are meant to be used as *temporary* solutions, not
permanent solutions.

> **You should always attempt to persuade the third-party package authors
to fix the metadata, rather than rely on an override over the long term.**

Rave provides two metadata properties to provide the correct info.

- "rave.missing" - provides metadata that is missing from third-party packages
- "rave.overrides" - overrides problematic metadata in third-party packages

As of rave 0.3.0, you can only override or provide missing values for
packages that are also specified in the "dependencies" property (also:
"peerDependencies" property in package.json). See [Overriding metadata from
rave extensions](#overriding-metadata-from-rave-extensions) and [Overriding
nested packages](#overriding-nested-packages) for more information.

> **Note**: you cannot alter the behavior of bower or npm via these
features!  For instance, bower and npm will not install additional dependencies
if you modify a package's "dependencies" property.

### Missing metadata - "rave.missing"

The most common cause of metadata problems is *missing* metadata.  Rave allows
application developers and extension authors to provide missing metadata
for third-party packages.  Since the metadata is only provided if it is
*missing*, rave will only provide it until the third-party package author
includes it in a later release.

For example, "almostAwesomeLib", when installed via bower,
does not install a bower.json or package.json at all.  Rave does a decent
job of guessing the missing information, but to remove any doubt, you should
provide the critical values in your app's bower.json file:

```js
{
	"rave": {
		"missing": {
			"almostAwesomeLib": {
				"name": "almostAwesomeLib",
				"main": "almostAwesomeLib.js",
				"moduleType": [ "amd", "node" ],
				"version": "0.0.0"
			}
		}
	}
	// ... other bower.json properties snipped ...
}
```

Note that rave will provide the entire metadata value.  It won't attempt to
merge object or array values.  Therefore, you should be careful to reproduce
all of the properties of an object value or all of the items in an array value.

For instance, if you wish to add a "node" item to the "moduleType" property,
and the existing property is `[ "amd", "globals" ]`, you should override
with the complete list: `[ "node", "amd", "globals" ]`.

### Incorrect metadata - "rave.overrides"

At times, a package's metadata can be ambiguous or even wrong.  For these cases,
rave allows app developers and extension authors to override third-party
metadata.  Unlike "rave.missing", "rave.overrides" does not check for existence
before overriding.  It blindly overrides the metadata value.

For instance, when installed via npm, the "foobarley" package specifies a "main"
property that specifies a version meant for testing under node.
To fix the "foobarley" package, include the following
snippet in your package.json:

```js
{
	"rave": {
		"overrides": {
			"foobarley": {
				"browser": "lib/foobarley.js"
			}
		}
	}
	// ... other package.json properties snipped ...
}
```

Note that the example specified "browser" instead of "main".  You could use
"main", but "browser" is the *de facto* way to distinguish browser-only
modules from node modules in package.json.

As of version 0.2.0, rave supports the "browser" property as defined in this
[gist](https://gist.github.com/defunctzombie/4339901).


## Overriding non-standard metadata

There is only one non-standard metadata value that you can specify for
"rave.overrides" or "rave.missing": it is "rootUrl".  It exists for bower and
allows you to specify an alternate directory for the root of the package.

```js
{
	"rave": {
		"missing": {
			"foobarley": {
				"rootUrl": "lib/browser/"
			}
		}
	}
}
```

In npm, the standard "directories.lib" property may be used instead of
"rootUrl".

## Overriding metadata from rave extensions

At the moment, a common task of rave extensions is to override or provide
missing values for third-party packages.  To do this properly, rave extensions
must not only specify the "rave.overrides" or "rave.missing" properties,
but should also specify the packages as peer dependencies.

In npm/package.json, the affected packages should be listed in the
"peerDependencies" property.  In bower/bower.json, they should be listed in
"dependencies" since all packages are peers in bower.

## Overriding nested packages

It is possible to override properties or provide missing values for nested
dependencies.  This is achieved by nesting "rave.overrides" or "rave.missing".

For instance, overriding the "moduleType" property of the instance of "meld"
that is used by "wire" can be achieved via nesting, as follows:

```js
{
	"rave": {
		"overrides": {
			"wire": {
				"rave": {
					"overrides": {
						"meld": {
							"moduleType": [ 'amd' ]
						}
					}
				}
			}
		}
	}
}
```

Keep in mind that the dependency hierarchy is not necessarily the same as
the directory structure.  Therefore, even though bower may hoist all packages
to be peers, their dependency graph is still a tree.  Similarly, after
running `npm dedupe`, the node_modules directory hierarchy may no longer
match the dependency hierarchy.

*tl:dr*; Don't look at the directory structure to decide if a package is nested.
Follow the dependency hierarchy in the metadata files ("dependencies" and
"peerDependencies").
