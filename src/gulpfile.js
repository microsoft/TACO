/*starter gulpfile, bootstraps compiling gulp-compile.ts and runs it*/
var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp");

gulp.on("task_not_found", function (err) {
    console.error("\n---Please run 'gulp prep' to prepare project\n");
});

/* compile the gulp-compile.ts file into JS */
gulp.task("prep", ["get-packages"], function (callback) {
    exec("tsc gulpmain.ts --outdir ../build --module commonjs", { cwd: "." }, callback);
});

/* install gulp in root folder */
gulp.task("get-packages", function (callback) {
    exec("npm install", { cwd: ".." }, callback);    
});

var gulpMain = "../build/src/gulpmain.js";
if (fs.existsSync(gulpMain)) {
    console.log("found");
    require(gulpMain);
}
else {
    console.log("not found:  "  + path.resolve(gulpMain));
}
module.exports = gulp;
