/// <reference path="typings/node.d.ts" />
/// <reference path="typings/q.d.ts" />


var fs = require("fs");
var gulp = require("gulp");
var del = require("del");
var path = require("path");
var exec = require("child_process").exec;
import stylecopUtil = require("../tools/stylecop-util");
import tsUtil = require("./taco-cli/compile/typescript-util");
import dtsUtil = require("../tools/tsdefinition-util");

var compilerPath = {
    src: ".",  // gulp task compiles all source under "taco-cli" source folder
    bin: "../bin/src",
    tools:  "../bin/tools"
};
var copFile = path.join(compilerPath.src, "../tools/internal/TSStyleCop.js");

////////////////// to add additional gulp tasks, add gulpfile in folder and reference it below
// for example:  require('./src/compile/gulpfile');
///////////////////////

/* Default task for building /src folder into /bin */
gulp.task("default", ["rebuild"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", function (callback: Function): void {
    var tsCompiler = new tsUtil.TypeScriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
    tsCompiler.compileDirectory(compilerPath.src, compilerPath.bin, callback);
});

/* full clean build */
gulp.task("rebuild", ["clean"], function (callback: Function): void {
    gulp.run("compile");
    gulp.run("copy");
});

/* Runs style cop on the sources. */
gulp.task("run-stylecop", ["clean-build"], function (callback: Function): void {    
    if (fs.existsSync("copFile")) {
        var styleCop = new stylecopUtil.StyleCopUtil();
        styleCop.runCop(compilerPath.src, copFile, callback);
    } else {
        callback();
    }
}); 

/* Cleans up the bin location, will have to call "gulp prep" again */
gulp.task("clean", function (callback: Function): void {
    del([compilerPath.bin + "/../**"], { force: true }, callback);    
});

/* copy package.json files from source to bin */
gulp.task("copy", function (callback: Function): void {    
    gulp.src(path.join(compilerPath.src, "/**/package.json")).pipe(gulp.dest(compilerPath.bin));
    gulp.src(path.join(compilerPath.src, "/**/resources.json")).pipe(gulp.dest(compilerPath.bin));
});

/* auto-generate taco-utils.d.ts*/
gulp.task("generate-dts", function (cb: Function): void {
    var tacoUtils: string = "taco-utils";
    dtsUtil.DefinitionServices.generateTSExportDefinition(
        tacoUtils,
        path.join(compilerPath.src, tacoUtils),
        path.join(compilerPath.src, "typings"),
        "TacoUtility",
        tacoUtils);
    cb();
});

/* Task to generate NPM package */

/* Task to run tests */
module.exports = gulp;
