# Debugging

It's easy to turn on debugging in RaveJS.  In your HTML file, add a
`data-debug` attribute to the `<html>` attribute.  `data-debug` turns on
**universal debugging**: every package that integrates with RaveJS should
enter into debugging mode when this attribute exists.

## Fine-grained debugging

Most rave extensions and third-party, RaveJS-aware packages have additional
debug settings.  These are typically turned on with an additional HTML
attribute.  For instance, when.js 3.0+ looks for `data-when-debug`.  If
either `data-debug` or `data-when-debug` is set on the `<html>`
element, when.js will install a promise monitor for better debugging.
Check the docs of your RaveJS-aware package or extension for more information
about debugging.

You may turn on debugging for only rave by including a `data-rave-debug`
attribute instead of `data-debug`.
