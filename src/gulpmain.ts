/// <reference path="typings/node.d.ts" />
/// <reference path="typings/q.d.ts" />

var fs = require("fs");
var gulp = require("gulp");
var del = require("del");
var path = require("path");
import dtsUtil = require ("../tools/tsdefinition-util");
import stylecopUtil = require ("../tools/stylecop-util");
import tsUtil = require ("./taco-cli/compile/typescript-util");
var buildConfig = require("../../src/build_config.json");

/* Default task for building /src folder into /bin */
gulp.task("default", ["build"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", function (callback: Function): void {
    var tsCompiler = new tsUtil.TypeScriptServices();
    console.log("buildConfig.src:  " + path.resolve(buildConfig.src));
    console.log("buildConfig.bin:  " + path.resolve(buildConfig.bin));
    tsCompiler.compileDirectory(buildConfig.src, buildConfig.bin, callback);
});

/* compile + copy */
gulp.task("build", ["compile"], function (callback: Function): void {
    gulp.run("copy");
});

/* full clean build */
gulp.task("rebuild", ["clean"], function (callback: Function): void {
    gulp.run("build");
});

/* Runs style cop on the sources. */
gulp.task("run-stylecop", function (callback: Function): void {            
    if (fs.existsSync(buildConfig.copPath)) {        
        var styleCop = new stylecopUtil.StyleCopUtil();
        styleCop.runCop(buildConfig.src, buildConfig.copPath, callback);
    } else {
        callback();
    }
}); 

/* Cleans up the bin location, will have to call "gulp prep" again */
gulp.task("clean", function (callback: Function): void {
    del([buildConfig.bin + "/../**"], { force: true }, callback);    
});

/* copy package.json and resources.json files from source to bin */
gulp.task("copy", function (callback: Function): void {    
    gulp.src(path.join(buildConfig.src, "/**/package.json")).pipe(gulp.dest(buildConfig.bin));
    gulp.src(path.join(buildConfig.src, "/**/resources.json")).pipe(gulp.dest(buildConfig.bin));
    gulp.src(path.join(buildConfig.src, "/**/test/**")).pipe(gulp.dest(buildConfig.bin));
    gulp.src(path.join(buildConfig.src, "/**/commands.json")).pipe(gulp.dest(buildConfig.bin));
    gulp.src(path.join(buildConfig.src, "/**/bin/**")).pipe(gulp.dest(buildConfig.bin));
});

/* auto-generate taco-utils.d.ts*/
gulp.task("generate-dts", function (): Q.Promise<any> {
    var tacoUtils: string = "taco-utils";
    return dtsUtil.DefinitionServices.generateTSExportDefinition(
        tacoUtils,
        path.join(buildConfig.src, tacoUtils),
        path.join(buildConfig.src, "typings"),
        "TacoUtility",
        tacoUtils);
});

/* Task to run tests */
module.exports = gulp;
