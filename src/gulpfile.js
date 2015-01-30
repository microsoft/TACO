/*starter gulpfile, bootstraps compiling gulp-compile.ts and runs it*/
var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp");

/*default task*/
gulp.task("default", ["runCompiledGulp"], function (cb) {
    console.log("************************************************************");
    console.log("Prepared taco-cli project for first use.....");
    console.log("Run 'gulp' in current folder or  'gulp fast-compile --gulpfile gulp-compile.js' in ../build/src for incremental builds");
    console.log("************************************************************\n\n");
});

/* Runs the compiled gulp file */
gulp.task("runCompiledGulp", ["compileTSGulpFiles"], function (cb) {
    exec("gulp --gulpfile gulp-compile.js", { cwd: "../build/src" }, cb);
});

/* compile the gulp-compile.ts file into JS */
gulp.task("compileTSGulpFiles", ["installRootFolderGulp", "installRootFolderTypeScript", "installRootFolderDel", "installRootFolderNcp"], function (cb) {
    exec("tsc gulp-compile.ts --outdir ../build --module commonjs", { cwd: "." }, cb);
});

/* install gulp in root folder */
gulp.task("installRootFolderGulp", function (cb) {
    exec("npm install gulp", { cwd: ".." }, cb);    
});

/* install typescript in root folder */
gulp.task("installRootFolderTypeScript", function (cb) {
    exec("npm install typescript", { cwd: ".." }, cb);
});

/* install del in root folder */
gulp.task("installRootFolderDel", function (cb) {
    exec("npm install del", { cwd: ".." }, cb);
});

/* install del in root folder */
gulp.task("installRootFolderNcp", function (cb) {
    exec("npm install ncp", { cwd: ".." }, cb);
});

module.exports = gulp;
