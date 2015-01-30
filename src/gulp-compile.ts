/// <reference path="typings/node.d.ts" />

var fs = require("fs");
var gulp = require("gulp");
var path = require("path");
var exec = require("child_process").exec;
import typescriptUtil = require("../tools/typescript-util");
import styleCopUtil = require("../tools/stylecop-util");
var del = require("del");

var compilerPath = {
    src: "../../src",  // gulp task compiles all source under "taco-cli" source folder
    bin: "../../bin",
};

////////////////// to add additional gulp tasks, add gulpfile in folder and reference it below
// for example:  require('./src/compile/gulpfile');
///////////////////////

/* Default task for compiler - runs clean, compile, combine. */
gulp.task("default", ["installBinDependencies", "styleCop"]);

/* Compiles the typescript files in the project. */
gulp.task("fast-compile", function (cb: Function): void {
    var tsUtil = new typescriptUtil.TacoUtils.TypescriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
    tsUtil.compileDirectory(compilerPath.src, compilerPath.bin, cb);
});

gulp.task("compile", ["clean"], function (cb: Function): void {
    var tsUtil = new typescriptUtil.TacoUtils.TypescriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
    tsUtil.compileDirectory(compilerPath.src, compilerPath.bin, cb);
});

/* Runs style cop on the sources. */
gulp.task("styleCop", function (cb: Function): void {
    var copFile = "../../tools/TSStyleCop/TSStyleCop.js";
    if (fs.existsSync("copFile")) {
        var styleCop = new styleCopUtil.TacoUtils.StyleCopUtil();
        styleCop.runCop(compilerPath.src, copFile, cb);
    } else {
        cb();
    }
}); 

/* Cleans up the bin location. */
gulp.task("clean", function (cb: Function): void {
    del([compilerPath.bin + "**"], { force: true }, cb);
});

/* copy package.json files from source to bin */
gulp.task("copyPackageJSON", ["compile"], function (cb: Function): void {
    var cliPath: string = "/taco-cli/package.json";
    var utilPath: string = "/taco-utility/package.json";
    fs.writeFileSync("../../bin" + cliPath, fs.readFileSync("../../src" + cliPath));
    fs.writeFileSync("../../bin" + utilPath, fs.readFileSync("../../src" + utilPath));
    cb();
});

gulp.task("installBinDependencies", ["copyPackageJSON"], function (cb: Function): void {
    exec("npm install", { cwd: "../../bin/taco-cli" }, cb);
});

/* Task to generate NPM package */

/* Test */

module.exports = gulp;
