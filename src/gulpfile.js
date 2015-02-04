/* starter gulpfile, bootstraps compiling gulp-compile.ts and runs it */
var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp"),
    buildConfig = require('./build_config.json');

gulp.on("task_not_found", function (err) {
    console.error("\n---Please run 'gulp prep' to prepare project\n");
});

/* compile the gulp-compile.ts file into JS */
gulp.task("prep", ["install"], function (callback) {
    exec("tsc gulpmain.ts --outdir " + buildConfig.compiledGulp + " --module commonjs", { cwd: "." }, callback);
});

/* install gulp in root folder */
gulp.task("install", function (callback) {
    var modules = ["del", "gulp", "typescript", "ncp", "q"];
    for (var i in modules){
        exec("npm install " + modules[i], { cwd: ".." });
    }    
    callback();
});


/*  
 to add additional gulp tasks, add gulpfile in folder and reference it below
 for example:  require('./src/compile/gulpfile');
*/
var gulpMain = path.join(buildConfig.bin, "gulpmain.js");
if (fs.existsSync(gulpMain)) {
    require(gulpMain);
}

module.exports = gulp;
