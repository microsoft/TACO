/// <reference path="../../typings/typescript.d.ts" />
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var TypeScriptServices = (function () {
    function TypeScriptServices() {
    }
    /**
     * Compiles typescript files based on the provided compiler options.
     */
    TypeScriptServices.prototype.compileTypescript = function (options, filenames, cb) {
        var _this = this;
        var host = ts.createCompilerHost(options);
        var program = ts.createProgram(filenames, options, host);
        var checker = ts.createTypeChecker(program, true);
        var result = checker.emitFiles();
        var allDiagnostics = program.getDiagnostics().concat(checker.getDiagnostics()).concat(result.diagnostics);
        allDiagnostics.forEach(function (diagnostic) { return _this.logDiagnosticMessage(diagnostic); });
        if (result.emitResultStatus !== 0) {
            /* compilation failed */
            if (cb) {
                cb(TypeScriptServices.FailureMessage);
            }
        }
        else {
            /* compilation succeeded */
            cb();
        }
    };
    /**
     * Recursively finds all the typescript files under the filesRoot path.
     */
    TypeScriptServices.prototype.getProjectTypescriptFiles = function (filesRoot, result) {
        if (fs.existsSync(filesRoot)) {
            var files = fs.readdirSync(filesRoot);
            for (var i = 0; i < files.length; i++) {
                var currentPath = path.join(filesRoot, files[i]);
                if (!fs.statSync(currentPath).isDirectory()) {
                    /* push the typescript files */
                    if (path.extname(currentPath) === ".ts" && !currentPath.match("gulpfile.ts") && !currentPath.match("gulpmain.ts")) {
                        result.push(currentPath);
                    }
                }
                else {
                    /* call the function recursively for subdirectories */
                    this.getProjectTypescriptFiles(currentPath, result);
                }
            }
        }
        return result;
    };
    /**
     * Compiles a diectory using the default settings, and the given source and destination location.
     */
    TypeScriptServices.prototype.compileDirectory = function (sourceDirectory, outputDirectory, cb) {
        var sourceFiles = this.getProjectTypescriptFiles(sourceDirectory, []);
        this.compileTypescript({
            noImplicitAny: true,
            noEmitOnError: true,
            target: 1 /* ES5 */,
            module: 1 /* CommonJS */,
            outDir: outputDirectory
        }, sourceFiles, cb);
    };
    /**
     * Pretty-prints a diagnostic message to the console.
     */
    TypeScriptServices.prototype.logDiagnosticMessage = function (diagnostic) {
        var sourceFile = diagnostic.file;
        if (sourceFile) {
            var lineAndCharacter = sourceFile.getLineAndCharacterFromPosition(diagnostic.start);
            console.warn(sourceFile.filename + "(" + lineAndCharacter.line + "," + lineAndCharacter.character + "): " + diagnostic.messageText);
        }
        else {
            console.warn(diagnostic.messageText);
        }
    };
    TypeScriptServices.FailureMessage = "Typescript compilation failed.";
    return TypeScriptServices;
})();
exports.TypeScriptServices = TypeScriptServices;
