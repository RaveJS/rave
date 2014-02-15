/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */
var fs = require('fs');

var eml, template, pipeline, rave, built;

eml = fs.readFileSync('./node_modules/es6-module-loader/lib/es6-module-loader.js');
template = fs.readFileSync('./src/_template.js');
pipeline = fs.readFileSync('build/temp/_pipeline.js');
rave = fs.readFileSync('./src/rave.js');

built = String(template)
	.replace(/\/\*===es6-module-loader===\*\//, eml)
	.replace(/\/\*===_rave===\*\//, rave)
	.replace(/\/\*===_pipeline===\*\//, pipeline);

fs.writeFileSync('rave.js', built);

console.log('Built file written to rave.js');
