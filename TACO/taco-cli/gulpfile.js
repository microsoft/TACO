/// <reference path="../typings/node/node.d.ts" />
/// <reference path="./lib/compile/gulpfile.ts" />
var gulp = require("gulp");
require("./lib/compile/gulpfile");
var styleCopUtil = require("../utility/styleCopUtil");
/* Project wide tasks. */
gulp.task("default", ["compilerDefault", "styleCop"]);
/* Runs style cop on the utilities. */
gulp.task("styleCop", ["compilerStyleCop"], function (cb) {
    var styleCop = new styleCopUtil.CordovaTools.StyleCopUtil();
    styleCop.runCop("../utility", "../../internal/TSStyleCop/TSStyleCop.js", cb);
});
module.exports = gulp;
