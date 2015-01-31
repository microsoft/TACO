/*starter gulpfile, bootstraps compiling gulp-compile.ts and runs it*/
var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp");

/*default task*/
gulp.task("default", ["run-compiled-gulp"], function (callback) {
    console.log("************************************************************");
    console.log("Prepared taco-cli project for first use.....");
    console.log("Run 'gulp' in current folder or  'gulp fast-compile --gulpfile gulp-compile.js' in ../build/src for incremental builds");
    console.log("************************************************************\n\n");
});

/* Runs the compiled gulp file */
gulp.task("run-compiled-gulp", ["compile-gulpmain"], function (callback) {
    var arg = process.argv.slice(2);
    var gulpOption = "";
    if (arg && arg[0])
        gulpOption = arg[0].replace("--", "");
    var gulpCommand = "gulp " + gulpOption + " --gulpfile gulpmain.js";
    console.log("---executing:  " + gulpCommand);
    exec(gulpCommand, { cwd: "../build" }, callback);
});

/* compile the gulp-compile.ts file into JS */
gulp.task("compile-gulpmain", ["install-root-folder-packages"], function (callback) {
    exec("tsc gulpmain.ts --outdir ../build --module commonjs", { cwd: "." }, callback);
});

/* install gulp in root folder */
gulp.task("install-root-folder-packages", function (callback) {
    exec("npm install", { cwd: ".." }, callback);    
});

module.exports = gulp;
