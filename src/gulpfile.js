/* starter gulpfile, bootstraps compiling gulpmain.ts and runs it */
var exec = require("child_process").exec,
    fs = require("fs"),
    path = require('path'),
    gulp = require("gulp"),
    npmUtil = require ("../tools/npmInstallerUtil"),
    buildConfig = require('./build_config.json');
    

gulp.on("task_not_found", function (err) {
    console.error("\nPlease run 'gulp prep' to prepare project\n");
});

/* compile the gulpmain.ts file into JS */
gulp.task("prep", ["install"], function (callback) {
    var ts = require('gulp-typescript');
    var merge = require("merge2");
    var sourcemaps = require("gulp-sourcemaps");
        return merge([
            gulp.src(["gulpmain.ts"])
                .pipe(sourcemaps.init())
                .pipe(ts(buildConfig.tsCompileOptions))
                .pipe(sourcemaps.write("."))
                .pipe(gulp.dest(buildConfig.buildSrc)),
            gulp.src(["../tools/**/*.ts"])
                .pipe(sourcemaps.init())
                .pipe(ts(buildConfig.tsCompileOptions))
                .pipe(sourcemaps.write("."))
            .pipe(gulp.dest(buildConfig.buildTools))
        ]);
});

/* install gulp in root folder */
gulp.task("install", function (callback) {
    npmUtil.installPackages(["del", "gulp", "typescript", "gulp-typescript", "gulp-sourcemaps", "merge2", "ncp", "q", "run-sequence", "archiver", "mocha-teamcity-reporter", "nopt"], callback);
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
