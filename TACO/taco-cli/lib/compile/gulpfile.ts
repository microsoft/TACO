/// <reference path="../../../typings/node/node.d.ts" />
/// <reference path="../../../typings/gulp/gulp.d.ts" />

import gulp = require ("gulp");
import fs = require ("fs");
import path = require ("path");
import ts = require ("typescript");
import child_process = require ("child_process");

import typescriptUtil = require ("../../../utility/typescriptUtil");
import styleCopUtil = require ("../../../utility/styleCopUtil");

var eventStream = require("event-stream");
var concat = require("gulp-concat");
var del = require("del");

/* Source path declarations for all the projects. Add a new path variable for each project & customize it as needed. */
var compilerPath = {
    src: ".",
    bin: "./bin",
    binSrc: "./bin/taco-cli/templates/typescript_hook",
    binUtil: "./bin/utility",
    templatesSrc: "./templates/typescript_hook"
};

/* Default task for compiler - runs clean, compile, combine. */
gulp.task("compilerDefault", ["compilerClean", "compilerCompile", "compilerMerge", "compilerStyleCop"]);

/* Compiles the typescript files in the project. */
gulp.task("compilerCompile", ["compilerClean"], function (cb: Function): void {
    var tsUtil = new typescriptUtil.CordovaTools.TypescriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
       
    tsUtil.compileDirectory(compilerPath.src, compilerPath.bin, cb);
});

/* Merges certain files after compilation. You can add to this task any post-compilation processing needed for your scenario. */
gulp.task("compilerMerge", ["compilerCompile"], function (): void {
    gulp.src([compilerPath.templatesSrc + "/nodeEnv.js", compilerPath.binUtil + "/typescriptUtil.js", compilerPath.binSrc + "/compileTypescript.js"])
        .pipe(concat("compileTypescriptNode.js"))
        .pipe(gulp.dest(compilerPath.binSrc));
    gulp.src([compilerPath.templatesSrc + "/nodeEnv.js", compilerPath.binSrc + "/main.js"])
        .pipe(concat("taco-compile"))
        .pipe(gulp.dest(compilerPath.binSrc));
    gulp.src(compilerPath.templatesSrc + "compileTypescriptConfig.json")
        .pipe(gulp.dest(compilerPath.binSrc));
});

/* Cleans up the bin location. */
gulp.task("compilerClean", function (cb: Function): void {
    del([compilerPath.bin + "**"], cb);
});

/* Runs style cop on the sources. */
gulp.task("compilerStyleCop", /*["compilerMerge"],*/ function (cb: Function): void {
    var styleCop = new styleCopUtil.CordovaTools.StyleCopUtil();
    console.log(path.resolve(compilerPath.src));
    styleCop.runCop(compilerPath.src, "../../Internal/TSStyleCop/TSStyleCop.js", cb);
});

export = gulp;
