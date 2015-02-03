/// <reference path="typings/node.d.ts" />
/// <reference path="typings/q.d.ts" />

var fs = require("fs");
var gulp = require("gulp");
var path = require("path");
var exec = require("child_process").exec;
import stylecopUtil = require("../tools/stylecop-util");
import tsUtil = require("./taco-cli/compile/typescript-util");
import dtsUtil = require("../tools/tsdefinition-util");
var del = require("del");
var ncp = require("ncp");
var Q = require("q");

var compilerPath = {
    src: ".",  // gulp task compiles all source under "taco-cli" source folder
    bin: "../bin",
};
var copFile = path.join(compilerPath.src, "../tools/internal/TSStyleCop.js");

////////////////// to add additional gulp tasks, add gulpfile in folder and reference it below
// for example:  require('./src/compile/gulpfile');
///////////////////////

/* Default task for building /src folder into /bin */
gulp.task("default", ["rebuild"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", function (callback: Function): void {
    compileTS(callback);
});

/* full clean build */
gulp.task("rebuild", ["copy-package-json", "run-stylecop", "copy-resources"], function (callback: Function): void {
    compileTS(callback);
});

/* full clean build */
gulp.task("clean-build", ["clean"], function (callback: Function): void {
    compileTS(callback);
});

/* Runs style cop on the sources. */
gulp.task("run-stylecop", ["clean-build"], function (callback: Function): void {    
    if (fs.existsSync("copFile")) {
        var styleCop = new stylecopUtil.StyleCopUtil();
        styleCop.runCop(compilerPath.src, copFile, callback);
    } else {
        callback();
    }
}); 

/* Cleans up the bin location. */
gulp.task("clean", function (callback: Function): void {
    //del([compilerPath.bin + "/**"], { force: true }, callback);
    console.log("abc");
});

/* copy package.json files from source to bin */
gulp.task("copy-package-json", ["clean-build"], function (callback: Function): void {    
    var cliPath: string = "/taco-cli/package.json";
    var utilPath: string = "/taco-utils/package.json";
    fs.writeFileSync(path.join(compilerPath.bin, cliPath), fs.readFileSync(path.join(compilerPath.src, cliPath)));
    fs.writeFileSync(path.join(compilerPath.bin, utilPath), fs.readFileSync(path.join(compilerPath.src, utilPath)));
    callback();
});

/* copy package.json files from source to bin */
gulp.task("copy-resources", ["clean-build"], function (callback: Function): void {
    ncp(path.join(compilerPath.src, "taco-cli/resources"), path.join(compilerPath.bin, "taco-cli/resources"), {clobber: true}, callback)
});

/* with package.json files setup in Bin folder, call npm install */
gulp.task("install-bin-modules", ["copy-package-json"], function (callback: Function): void {
    exec("npm install", { cwd: path.join(compilerPath.bin, "taco-cli")}, callback);
});

/* auto-generate taco-utils.d.ts*/
gulp.task("generate-dts", function (cb: Function): void {
    var tacoUtils: string = "taco-utils";
    dtsUtil.DefinitionServices.generateTSExportDefinition(
        tacoUtils,
        path.join(compilerPath.src, tacoUtils),
        path.join(compilerPath.src, "typings"),
        "TacoUtility",
        tacoUtils);
    cb();
});

function compileTS(callback: Function) {
    var tsCompiler = new tsUtil.TypeScriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
    tsCompiler.compileDirectory(compilerPath.src, compilerPath.bin, callback);
}
/* Task to generate NPM package */

/* Task to run tests */

module.exports = gulp;
