/** @license MIT License (c) copyright 2014 original authors */
/** @author Brian Cavalier */
/** @author John Hann */

var instantiateNode = require('../../pipeline/instantiateNode');
var nodeFactory = require('./nodeFactory');
var nodeEval = require('./nodeEval');
var instantiateAmd = require('../../pipeline/instantiateAmd');
var captureDefines = require('./captureDefines');
var amdEval = require('./amdEval');
var instantiateScript = require('../../pipeline/instantiateScript');
var scriptFactory = require('./scriptFactory');
var scriptEval = require('./scriptEval');

exports.amd = instantiateAmd(captureDefines(amdEval));
exports.node = instantiateNode(nodeFactory(nodeEval));
exports.globals = instantiateScript(scriptFactory(scriptEval));

