var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp");

/*default task*/
gulp.task("default", ["runCompiledGulp"], function (cb) {
    console.log("************************************************************");
    console.log("Prepared taco-cli project for first use.....");
    console.log("Run 'gulp' in current folder or  'gulp --gulpfile gulp-compile.js' in ../build/src for subsequent builds");
    console.log("************************************************************\n\n");
});

/* Runs style cop on the sources. */
gulp.task("runCompiledGulp", ["compileTSGulpFiles"], function (cb) {
    exec("gulp --gulpfile gulp-compile.js", { cwd: "../build/src" }, cb);
});

/* Runs style cop on the sources. */
gulp.task("compileTSGulpFiles", ["installRootFolderGulp", "installRootFolderTypeScript", "installRootFolderDel"], function (cb) {
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

/* install typescript in root folder */
gulp.task("installRootFolderDel", function (cb) {
    exec("npm install del", { cwd: ".." }, cb);
});

module.exports = gulp;
