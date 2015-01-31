/// <reference path="typings/node.d.ts" />
/// <reference path="typings/q.d.ts" />

var fs = require("fs");
var gulp = require("gulp");
var path = require("path");
var exec = require("child_process").exec;
import stylecopUtil = require("./taco-cli/compile/stylecop-util");
import tsUtil = require("./taco-cli/compile/typescript-util");
import dtsUtil = require("./taco-cli/compile/tsdefinition-util");
var del = require("del");
var ncp = require("ncp");
var Q = require("q");

var compilerPath = {
    src: "../src",  // gulp task compiles all source under "taco-cli" source folder
    bin: "../bin",
};
var copFile = path.join(compilerPath.src, "taco-cli/compile/TSStyleCop/TSStyleCop.js");

////////////////// to add additional gulp tasks, add gulpfile in folder and reference it below
// for example:  require('./src/compile/gulpfile');
///////////////////////

/* Default task for building /src folder into /bin */
gulp.task("default", ["copy-package-json", "rebuild", "run-stylecop", "copy-resources"]);

/* Compiles the typescript files in the project, for fast iterative use */
gulp.task("compile", ["generate-utility-dts"],  function (callback: Function): void {
    compileTS(callback);
});

/* full clean build */
gulp.task("rebuild", ["clean", "generate-utility-dts"], function (callback: Function): void {
    compileTS(callback);
});

/* Runs style cop on the sources. */
gulp.task("run-stylecop", function (callback: Function): void {    
    if (fs.existsSync("copFile")) {
        var styleCop = new stylecopUtil.StyleCopUtil();
        styleCop.runCop(compilerPath.src, copFile, callback);
    } else {
        callback();
    }
}); 

/* Cleans up the bin location. */
gulp.task("clean", function (callback: Function): void {
    del([compilerPath.bin + "/**"], { force: true }, callback);
});

/* copy package.json files from source to bin */
gulp.task("copy-package-json", ["rebuild"], function (callback: Function): void {    
    var cliPath: string = "/taco-cli/package.json";
    var utilPath: string = "/taco-utils/package.json";
    fs.writeFileSync(path.join(compilerPath.bin, cliPath), fs.readFileSync(path.join(compilerPath.src, cliPath)));
    fs.writeFileSync(path.join(compilerPath.bin, utilPath), fs.readFileSync(path.join(compilerPath.src, utilPath)));
    callback();
});

/* copy package.json files from source to bin */
gulp.task("copy-resources", ["rebuild"], function (callback: Function): void {
    ncp(path.join(compilerPath.src, "taco-cli/resources"), path.join(compilerPath.bin, "taco-cli/resources"), {clobber: true}, callback)
});

/* with package.json files setup in Bin folder, call npm install */
gulp.task("install-bin-modules", ["copy-package-json"], function (callback: Function): void {
    exec("npm install", { cwd: path.join(compilerPath.bin, "taco-cli")}, callback);
});

function compileTS(callback: Function) {
    var tsCompiler = new tsUtil.TypeScriptServices();
    console.log("compilerPath.src:  " + path.resolve(compilerPath.src));
    console.log("compilerPath.bin:  " + path.resolve(compilerPath.bin));
    tsCompiler.compileDirectory(compilerPath.src, compilerPath.bin, callback);
}

/* auto-generate taco-utils.d.ts*/
gulp.task("generate-utility-dts", function (cb: Function): void {
    var tacoUtils: string = "taco-utils";
    dtsUtil.DefinitionServices.generateTSExportDefinition(
        tacoUtils,
        path.join(compilerPath.src, tacoUtils),
        path.join(compilerPath.src, "typings"),
        "TacoUtility",
        tacoUtils);
    cb();
});

/* Task to generate NPM package */

/* Task to run tests */

module.exports = gulp;
