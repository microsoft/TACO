/// <reference path="typings/node.d.ts" />
/// <reference path="typings/Q.d.ts" />
/// <reference path="typings/gulp.d.ts" />
/// <reference path="typings/gulpExtensions.d.ts" />
/// <reference path="typings/nopt.d.ts" />
/// <reference path="typings/merge2.d.ts" />
/// <reference path="typings/gulp-typescript.d.ts" />
/// <reference path="typings/gulp-sourcemaps.d.ts" />
/// <reference path="typings/replace.d.ts" />

var runSequence = require("run-sequence");
import gulp = require ("gulp");
import sourcemaps = require ("gulp-sourcemaps");
import ts = require ("gulp-typescript");
import merge = require ("merge2");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import replace = require ("replace");

import stylecopUtil = require ("../tools/stylecopUtil");
import gulpUtils = require ("../tools/GulpUtils");
 
var buildConfig = require("../../src/build_config.json");
var tacoModules = ["taco-utils", "taco-kits", "taco-dependency-installer", "taco-cli", "remotebuild", "taco-remote", "taco-remote-lib"];

// honour --moduleFilter flag.
// gulp --moduleFilter taco-cli will build/install/run tests only for taco-cli
var options: any = nopt({ moduleFilter: String, }, {}, process.argv);
if (options.moduleFilter && tacoModules.indexOf(options.moduleFilter) > -1) {
    tacoModules = [options.moduleFilter];
}

/* Default task for building /src folder into /bin */
gulp.task("default", ["install-build"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", function (callback: Function): Q.Promise<any> {
    return gulpUtils.streamToPromise(gulp.src([buildConfig.src + "/**/*.ts", "!" + buildConfig.src + "/gulpmain.ts"])
        .pipe(sourcemaps.init())
        .pipe(ts(buildConfig.tsCompileOptions))
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(buildConfig.buildPackages)))
        .then(function (): Q.Promise<any> {
            return Q.all([
                gulpUtils.prepareJsdocJson(path.join(buildConfig.buildPackages, "taco-remote", "lib", "tacoRemoteConfig.js")),
                gulpUtils.prepareJsdocJson(path.join(buildConfig.buildPackages, "remotebuild", "lib", "remoteBuildConf.js"))
            ]);
    });
});

/* compile + copy */
gulp.task("build", ["prepare-templates"], function (callback: Function): void {
    runSequence("compile", "copy", callback);
});

/* full clean build */
gulp.task("rebuild", function (callback: Function): void {
    runSequence("clean", "build", callback);
});

/* Task to install the compiled modules */
gulp.task("install-build", ["build"], function (): Q.Promise<any> {
    return gulpUtils.installModules(tacoModules, buildConfig.buildPackages);
});

/* Runs style cop on the sources. */
gulp.task("run-stylecop", function (callback: Function): void {
    var styleCop = new stylecopUtil.StyleCopUtil();
    styleCop.runCop(buildConfig.src, buildConfig.copPath, buildConfig.copConfig, callback);
}); 

/* Cleans up the build location, will have to call "gulp prep" again */
gulp.task("clean", ["uninstall-build"], function (): void {
});

/* Task to install the compiled modules */
gulp.task("uninstall-build", [], function (): Q.Promise<any> {
    return gulpUtils.uninstallModules(tacoModules, buildConfig.buildPackages);
});

/* Cleans up only the templates in the build folder */
gulp.task("clean-templates", function (callback: (err: Error) => void): void {
    gulpUtils.deleteDirectoryRecursive(path.resolve(buildConfig.buildTemplates), callback);
});

/* copy package.json and resources.json files from source to bin */
gulp.task("copy", function (): Q.Promise<any> {
    return gulpUtils.copyFiles(
        [
            "/**/package.json",
            "/**/resources.json",
            "/**/test/**",
            "/**/commands.json",
            "/**/TacoKitMetaData.json",
            "/**/bin/**",
            "/**/templates/**",
            "/**/examples/**",
            "/**/*.ps1",
            "/**/dynamicDependencies.json",
            "/**/platformDependencies.json"
        ],
        buildConfig.src, buildConfig.buildPackages).then(function (): void {
            /* replace %TACO_BUILD_PACKAGES% with the absolute path of buildConfig.buildPackages in the built output */
            replace({
                regex: /%TACO_BUILD_PACKAGES%/g,
                replacement: JSON.stringify(path.resolve(buildConfig.buildPackages)).replace(/"/g, ""),
                paths: [buildConfig.buildPackages],
                includes: "*.json",
                recursive: true,
                silent: false
            });
    });
});

/* Task to run tests */
gulp.task("run-tests", ["install-build"], function (): Q.Promise<any> {
    return gulpUtils.runAllTests(tacoModules, buildConfig.buildPackages);
});

/* Task to archive template folders */
gulp.task("prepare-templates", ["clean-templates"], function (): Q.Promise<any> {
    return gulpUtils.prepareTemplates(buildConfig.templates, buildConfig.buildTemplates);
});

module.exports = gulp;
