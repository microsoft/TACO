/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <reference path="../src/typings/gulp.d.ts" />
/// <reference path="../src/typings/gulpExtensions.d.ts" />
/// <reference path="../src/typings/nopt.d.ts" />
/// <reference path="../src/typings/gulp-typescript.d.ts" />
/// <reference path="../src/typings/gulp-sourcemaps.d.ts" />
/// <reference path="../src/typings/run-sequence.d.ts" />
/// <reference path="../src/typings/buildConfig.d.ts" />

import runSequence = require ("run-sequence");
import gulp = require ("gulp");
import sourcemaps = require ("gulp-sourcemaps");
import ts = require ("gulp-typescript");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");

import GulpUtils = require ("./GulpUtils");
import GulpCoverageUtils = require ("./GulpCoverageUtils");
import GulpPackageUtils = require ("./GulpPackageUtils");

/* tslint:disable:no-var-requires */
// var require needed to require build_config.json
var buildConfig: BuildConfig.IBuildConfig = require("./build_config.json");
/* tslint:enable:no-var-requires */

var tacoModules: string[] = [
    "taco-utils",
    "taco-kits",
    "taco-dependency-installer",
    "taco-cli",
    "remotebuild",
    "taco-remote",
    "taco-remote-lib",
    "taco-tests-utils",
    "taco-remote-multiplexer"
];

var supportedFlags: Nopt.FlagTypeMap = {
    modulesFilter: [String, Array], // Run any task for a selected module
    drop: String, // a custom drop location where built package.tgz can be dropped
    secondaryCoverageDirs: [String, Array], // list of secondary coverage files location
    failTestsAtEnd: Boolean, // if true, for multiple packages, fails test run only at the end
    testsReporter: String
};

var supportedShorthands: Nopt.ShortFlags = {
    "m": ["--modulesFilter"],
    "scd": ["--secondaryCoverageDirs"],
    "ftae": ["--failTestsAtEnd"]
};

var options: any = nopt(supportedFlags, supportedShorthands, process.argv);

if (options.modulesFilter) {
    tacoModules = tacoModules.filter((tacoModule: string) => options.modulesFilter.indexOf(tacoModule) > -1);
}

/* Default task for building /src folder into /bin */
gulp.task("default", ["install-build"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", function (): Q.Promise<any> {
    return GulpUtils.streamToPromise(gulp.src([buildConfig.src + "/**/*.ts", "!" + buildConfig.src + "/gulpmain.ts"])
        .pipe(sourcemaps.init())
        .pipe(ts(buildConfig.tsCompileOptions))
        .pipe(sourcemaps.write(".", {sourceRoot: ""}))
        .pipe(gulp.dest(buildConfig.buildPackages)));
});

/* compile + copy */
gulp.task("build", ["prepare-templates"], function (callback: gulp.TaskCallback): void {
    runSequence("compile", "copy", callback);
});

gulp.task("package", [], function (callback: gulp.TaskCallback): void {
    runSequence("build", "dev-package", callback);
});

gulp.task("just-package", [], function(callback: gulp.TaskCallback): void {
    runSequence("beta-package", "release-package", "dev-package", callback);
});

gulp.task("dev-package", ["copy"], function(): Q.Promise<any> {
    return GulpPackageUtils.package(buildConfig.buildPackages, tacoModules, "dev", options.drop || buildConfig.buildPackages);
});

gulp.task("beta-package", ["copy"], function(): Q.Promise<any> {
    return GulpPackageUtils.package(buildConfig.buildPackages, tacoModules, "beta", options.drop || buildConfig.buildPackages);
});

gulp.task("release-package", ["copy"], function(): Q.Promise<any> {
    return GulpPackageUtils.package(buildConfig.buildPackages, tacoModules, "release", options.drop || buildConfig.buildPackages);
});

/* full clean build */
gulp.task("rebuild", function (callback: gulp.TaskCallback): void {
    runSequence("clean", "build", callback);
});

/* Task to install the compiled modules */
gulp.task("install-build", ["package"], function (): Q.Promise<any> {
    return GulpUtils.installModules(tacoModules, buildConfig.buildPackages);
});

gulp.task("clean", function (): Q.Promise<any> {
    return GulpUtils.uninstallModules(tacoModules, buildConfig.buildPackages)
    .then(function(): Q.Promise<any> {
        return GulpUtils.deleteDirectoryRecursive(path.resolve(buildConfig.buildPackages));
    });
});

/* Cleans up only the templates in the build folder */
gulp.task("clean-templates", function (): Q.Promise<any> {
    return GulpUtils.deleteDirectoryRecursive(path.resolve(buildConfig.buildTemplates));
});

/* copy package.json and resources.json files from source to bin */
gulp.task("copy", function (): Q.Promise<any> {
    // Note: order matters, and later inclusions/exclusions take precedence over earlier ones.
    var filesToCopy: string[] = [
        "/**",
        "!/typings/**",
        "!/**/*.ts",
        "/*/.npmignore",
        "/**/templates/**",
        "/**/examples/**",
        "/**/dynamicDependencies.json"
    ].map((val: string): string => val[0] === "!" ? "!" + path.join(buildConfig.src, val.substring(1)) : path.join(buildConfig.src, val));

    return GulpUtils.copyFiles(filesToCopy, buildConfig.buildPackages);
});

/* Task to run typescript linter on source code (excluding typings) */
gulp.task("tslint", function(): Q.Promise<any> {
    var tslint: any = require("gulp-tslint");
    return GulpUtils.streamToPromise(
        gulp.src([buildConfig.src + "/**/*.ts",
            "!" + buildConfig.src + "/typings/**"])
        .pipe(tslint())
        .pipe(tslint.report("verbose")));
});

/* Task to run tests */
gulp.task("run-tests", ["install-build", "tslint"], function (): Q.Promise<any> {
    return GulpUtils.runAllTests(tacoModules, buildConfig.buildPackages, options.failTestsAtEnd, options.testsReporter);
});

/* Task to archive template folders */
gulp.task("prepare-templates", ["clean-templates"], function (): Q.Promise<any> {
    return GulpUtils.prepareTemplates(buildConfig.templates, buildConfig.buildTemplates);
});
/* tslint:enable:no-console */

/* Task to coverage tests */
gulp.task("coverage", ["install-build"], function(): Q.Promise<any> {
    return GulpCoverageUtils.runCoverage(tacoModules, buildConfig.buildPackages, buildConfig.buildCoverage, options.secondaryCoverageDirs);
});

module.exports = gulp;
