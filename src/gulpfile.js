/* starter gulpfile, bootstraps compiling gulpmain.ts and runs it */
var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp"),
    npmUtil = require ("../tools/npm-installer-util"),
    buildConfig = require('./build_config.json');

gulp.on("task_not_found", function (err) {
    console.error("\nPlease run 'gulp prep' to prepare project\n");
});

/* compile the gulpmain.ts file into JS */
gulp.task("prep", ["install"], function (callback) {
    exec("tsc gulpmain.ts --outdir " + buildConfig.build + " --module commonjs", function (error, stdout, stderr) {
        // Emit typscript compilation errors on command line
        if (error != null) {
            callback(stdout + error);
        } else {
            callback();
        }
    });
});

/* install gulp in root folder */
gulp.task("install", function (callback) {
    npmUtil.installPackages(["del", "gulp", "typescript", "ncp", "q", "run-sequence", "archiver", "mocha-teamcity-reporter", "nopt"], callback);
});

/*  
 to add additional gulp tasks, add gulpfile in folder and reference it below
 for example:  require('./src/compile/gulpfile');
*/
var gulpMain = path.join(buildConfig.buildSrc, "gulpmain.js");
if (fs.existsSync(gulpMain)) {
    require(gulpMain);
}

module.exports = gulp;
