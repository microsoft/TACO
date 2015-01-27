/// <reference path="../typings/node/node.d.ts" />
/// <reference path="../utility/typescriptUtil.ts" />
/// <reference path="../utility/styleCopUtil.ts" />

var fs = require("fs");
var gulp = require("gulp");
var path = require("path");
var typescriptUtil = require("../utility/typescriptUtil");
var styleCopUtil = require("../utility/styleCopUtil");
var eventStream = require("event-stream");
var concat = require("gulp-concat");
var del = require("del");

var compilerPath = {
    src: "../../..",  // gulp task compiles all source under "taco-cli" source folder
    bin: "../..",
};

////////////////// to add additional gulp tasks, add gulpfile in folder and reference it below
// for example:  require('./src/compile/gulpfile');
///////////////////////

/* Project wide tasks below, 1 entry for each gulp task */
gulp.task("default", ["compilerDefault", "compilerStyleCop"]);

/* Default task for compiler - runs clean, compile, combine. */
gulp.task("compilerDefault", ["compilerClean", "compilerCompile", "compilerStyleCop"]);

/* Compiles the typescript files in the project. */
gulp.task("compilerCompile", ["compilerClean"], function (cb: Function): void {
    var tsUtil = new typescriptUtil.CordovaTools.TypescriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
    tsUtil.compileDirectory(compilerPath.src, compilerPath.bin, cb);
});

/* Cleans up the bin location. */
gulp.task("compilerClean", function (cb: Function): void {
    del([compilerPath.bin + "**"], cb);
});

/* Runs style cop on the sources. */
gulp.task("compilerStyleCop", function (cb: Function): void {
    var copFile = "../../../../../Internal/TSStyleCop/TSStyleCop.js";
    if (!fs.existsSync("copFile")) {
        var styleCop = new styleCopUtil.CordovaTools.StyleCopUtil();
        styleCop.runCop(compilerPath.src, copFile, cb);
    }
}); 

/* Task to generate NPM package */

/* Test */

module.exports = gulp;
