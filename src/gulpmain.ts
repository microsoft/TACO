/// <reference path="typings/node.d.ts" />
/// <reference path="typings/Q.d.ts" />

var fs = require("fs");
var gulp = require("gulp");
var del = require("del");
var path = require("path");
var runSequence = require('run-sequence');
import dtsUtil = require ("../tools/tsdefinition-util");
import stylecopUtil = require ("../tools/stylecop-util");
import tsUtil = require ("./taco-cli/compile/typescript-util");
var buildConfig = require("../../src/build_config.json");

/* Default task for building /src folder into /bin */
gulp.task("default", ["install-build"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", function (callback: Function): void {
    var tsCompiler = new tsUtil.TypeScriptServices();
    tsCompiler.compileDirectory(buildConfig.src, buildConfig.buildSrc, callback);
});

/* compile + copy */
gulp.task("build", function (callback: Function): void {
    runSequence("compile", "copy", callback);
});

/* full clean build */
gulp.task("rebuild", function (callback: Function): void {
    runSequence("clean", "build", callback);
});

/* build the source and install all the packages locally */
gulp.task("install-build", ["build"], function (callback) {
    
    var tacoPackages = ["taco-cli"];
    var tacoPackagesFolder = tacoPackages.map(function(pkg) { 
        return path.join(process.cwd(), buildConfig.buildSrc, pkg); 
    });

    var npmUtil = require (path.join(process.cwd(), "../tools/npm-installer-util"));
    npmUtil.installPackages(tacoPackagesFolder, function (){
        var binpath = path.join(process.cwd(), "../node_modules/.bin");
        if (process.env.PATH.split(path.delimiter).indexOf(binpath) <= -1 &&
	    process.env.PATH.split(path.delimiter).indexOf(binpath + path.sep) <= -1){
            callback("taco packages not in path. You should add '"+binpath+ "' to PATH");
        } else {
            callback();
        }
    });
});


/* Runs style cop on the sources. */
gulp.task("run-stylecop", function (callback: Function): void {
    if (fs.existsSync(buildConfig.copPath) && fs.existsSync(buildConfig.copConfig)) {       
        var styleCop = new stylecopUtil.StyleCopUtil();
        styleCop.runCop(buildConfig.src, buildConfig.copPath, buildConfig.copConfig, callback);
    } else {
        callback();
    }
}); 

/* Cleans up the build location, will have to call "gulp prep" again */
gulp.task("clean", function (callback: Function): void {
    var util = require('util');
    var buildPath = path.join(process.cwd(), buildConfig.build);
    console.warn(util.format('Deleting %s', buildPath));
    del([buildPath + "/**"], { force: true }, callback);
});

/* copy package.json and resources.json files from source to bin */
gulp.task("copy", function (callback: Function): void {    
    gulp.src(path.join(buildConfig.src, "/**/package.json")).pipe(gulp.dest(buildConfig.buildSrc));
    gulp.src(path.join(buildConfig.src, "/**/resources.json")).pipe(gulp.dest(buildConfig.buildSrc));
    gulp.src(path.join(buildConfig.src, "/**/test/**")).pipe(gulp.dest(buildConfig.buildSrc));
    gulp.src(path.join(buildConfig.src, "/**/commands.json")).pipe(gulp.dest(buildConfig.buildSrc));
    gulp.src(path.join(buildConfig.src, "/**/bin/**")).pipe(gulp.dest(buildConfig.buildSrc));
    callback();
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
