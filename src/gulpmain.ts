/// <reference path="typings/node.d.ts" />
/// <reference path="typings/Q.d.ts" />
/// <reference path="typings/gulp.d.ts" />
/// <reference path="typings/gulp-extensions.d.ts" />
/// <reference path="typings/del.d.ts" />
/// <reference path="typings/tar.d.ts" />
/// <reference path="typings/fstream.d.ts" />
var runSequence = require("run-sequence");
import child_process = require ("child_process");
import fs = require ("fs");
import gulp = require ("gulp");
import del = require ("del");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import tar = require ("tar");
import fstream = require ("fstream");
import zlib = require ("zlib");
import dtsUtil = require ("../tools/tsdefinition-util");
import stylecopUtil = require ("../tools/stylecop-util");
import tsUtil = require ("./taco-cli/compile/typescript-util");

var buildConfig = require("../../src/build_config.json");

var modulesToInstallAndTest = ["taco-utils", "taco-cli", "taco-kits"];

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

/* Task to install the compiled modules */
gulp.task("copy-build", ["build"], function (): any {
    return gulp.src(path.join(buildConfig.buildSrc, "/**")).pipe(gulp.dest(buildConfig.buildBin));
});

function TrimEnd(str: string, chars: string[]): string {
    // Trim "/" from the end
    var index: number = str.length - 1;
    while (chars.indexOf(str[index]) > -1) {
        index--;
    }

    return str.substring(0, index + 1);
}

gulp.task("install-build", ["copy-build"], function (): Q.Promise<any> {
    var paths = modulesToInstallAndTest.map(function (m: string): string { return path.resolve(buildConfig.buildBin, m); });
    return paths.reduce(function (soFar: Q.Promise<any>, val: string): Q.Promise<any> {
        return soFar.then(function (): Q.Promise<any> {
            console.log("Installing " + val);
            var deferred = Q.defer<Buffer>();
            child_process.exec("npm install", { cwd: val }, deferred.makeNodeResolver());
            return deferred.promise;
        });
    }, Q({})).then(function (): void {
        // Check whether the taco-cli is in the path and warn if not
        var binpath = path.resolve(buildConfig.buildBin, "taco-cli", "bin");
        var pathsInPATH: string[] = process.env.PATH.split(path.delimiter);
        for (var i: number = 0; i < pathsInPATH.length; i++) { 
            // Trim "/" from the end
            if (TrimEnd(pathsInPATH[i], [path.sep, "/"]) === binpath) {
                // PATH contains the location of the compiled taco executable
                return;
            }
        }

        console.warn("Warning: the compiled 'taco' CLI is not in your PATH. Consider adding " + binpath + " to PATH.");
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
gulp.task("clean", function (callback: (err: Error) => void): void {
    var util = require("util");
    var buildPath = path.resolve(buildConfig.build);
    console.warn(util.format("Deleting %s", buildPath));
    del([buildPath + "/**"], { force: true }, callback);
});

/* Cleans up only the templates in the build folder */
gulp.task("clean-templates", function (callback: (err: Error) => void): void {
    var util = require("util");
    var templatesPath = path.resolve(buildConfig.buildTemplates);
    console.warn(util.format("Deleting %s", templatesPath));
    del([templatesPath + "/**"], { force: true }, callback);
});

function streamToPromise(stream: NodeJS.ReadWriteStream|NodeJS.WritableStream): Q.Promise<any> {
    var deferred = Q.defer();
    stream.on("finish", function (): void {
        deferred.resolve({});
    });
    stream.on("error", function (e: Error): void {
        deferred.reject(e);
    });
    return deferred.promise;
}

/* copy package.json and resources.json files from source to bin */
gulp.task("copy", function (): Q.Promise<any> {    
    return Q.all([
        gulp.src(path.join(buildConfig.src, "/**/package.json")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/resources.json")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/test/**")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/commands.json")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/bin/**")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/templates/**")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/examples/**")).pipe(gulp.dest(buildConfig.buildSrc)),
        gulp.src(path.join(buildConfig.src, "/**/*.ps1")).pipe(gulp.dest(buildConfig.buildSrc)),
    ].map(streamToPromise));
});

/* Task to run tests */
gulp.task("run-tests", ["install-build"], function (): Q.Promise<any> {
    var paths = modulesToInstallAndTest.map(function (m: string): string {
        return path.resolve(buildConfig.buildBin, m); 
    });
    var npmCommand = "npm" + (os.platform() === "win32" ? ".cmd" : "");
    return paths.reduce(function (soFar: Q.Promise<any>, val: string): Q.Promise<any> {
        return soFar.then(function (): Q.Promise<any> {
            console.log("Running tests for " + val);
            var testProcess = child_process.spawn(npmCommand, ["test"], { cwd: val, stdio: "inherit" });
            var deferred = Q.defer();
            testProcess.on("close", function (code: number): void {
                if (code) {
                    deferred.reject("Test failed for " + val);
                } else {
                    deferred.resolve({});
                }
            });
            return deferred.promise;
        });
    }, Q({}));
});

/* Task to archive template folders */
gulp.task("prepare-templates", ["clean-templates"], function (): Q.Promise<any> {
    var buildTemplatesPath: string = path.resolve(buildConfig.buildTemplates);
    var pipes: NodeJS.WritableStream[] = [];

    if (!fs.existsSync(buildTemplatesPath)) {
        fs.mkdirSync(buildTemplatesPath);
    }

    // Read the templates dir to discover the different kits
    var templatesPath: string = buildConfig.templates;
    var kits: string[] = getChildDirectoriesSync(templatesPath);

    kits.forEach(function (value: string, index: number, array: string[]): void {
        // Read the kit's dir for all the available templates
        var kitSrcPath: string = path.join(buildConfig.templates, value);
        var kitTargetPath: string = path.join(buildTemplatesPath, value);

        if (!fs.existsSync(kitTargetPath)) {
            fs.mkdirSync(kitTargetPath);
        }

        var kitTemplates: string[] = getChildDirectoriesSync(kitSrcPath);

        kitTemplates.forEach(function (value: string, index: number, array: string[]): void {
            var templateSrcPath: string = path.resolve(kitSrcPath, value);
            var templateTargetPath: string = path.join(kitTargetPath, value + ".tar.gz");
            var dirReader: fstream.Reader = new fstream.Reader({ path: templateSrcPath, type: "Directory", mode: 777 });
            var pipe: NodeJS.WritableStream = dirReader.pipe(tar.Pack()).pipe(zlib.createGzip()).pipe(new fstream.Writer({ path: templateTargetPath }));

            pipes.push(pipe);
        });
    });

    return Q.all(pipes.map(streamToPromise));
});

/* Task to deploy the archived templates to taco-kits package */
gulp.task("copy-templates", ["prepare-templates"], function (): any {
    return gulp.src(path.join(buildConfig.buildTemplates, "/**")).pipe(gulp.dest(buildConfig.deployTemplates));
});

function getChildDirectoriesSync(dir: string): string[] {
    return fs.readdirSync(dir).filter(function (entry: string): boolean {
        return fs.statSync(path.resolve(dir, entry)).isDirectory();
    });
}

module.exports = gulp;
