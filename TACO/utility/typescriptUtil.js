/// <reference path="../typings/typescript/typescript.d.ts" />
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var CordovaTools;
(function (CordovaTools) {
    var TypescriptServices = (function () {
        function TypescriptServices() {
        }
        /**
         * Compiles typescript files based on the provided compiler options.
         */
        TypescriptServices.prototype.compileTypescript = function (options, filenames, cb) {
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
                    cb(TypescriptServices.FailureMessage);
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
        TypescriptServices.prototype.getProjectTypescriptFiles = function (filesRoot, result) {
            if (fs.existsSync(filesRoot)) {
                var files = fs.readdirSync(filesRoot);
                for (var i = 0; i < files.length; i++) {
                    var currentPath = path.join(filesRoot, files[i]);
                    if (!fs.statSync(currentPath).isDirectory()) {
                        /* push the typescript files */
                        if (path.extname(currentPath) === ".ts" && !currentPath.match("d.ts$") && !currentPath.match("gulpfile.ts")) {
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
        TypescriptServices.prototype.compileDirectory = function (sourceDirectory, outputDirectory, cb) {
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
        TypescriptServices.prototype.logDiagnosticMessage = function (diagnostic) {
            var sourceFile = diagnostic.file;
            var lineAndCharacter = sourceFile.getLineAndCharacterFromPosition(diagnostic.start);
            console.warn(sourceFile.filename + "(" + lineAndCharacter.line + "," + lineAndCharacter.character + "): " + diagnostic.messageText);
        };
        TypescriptServices.FailureMessage = "Typescript compilation failed.";
        return TypescriptServices;
    })();
    CordovaTools.TypescriptServices = TypescriptServices;
})(CordovaTools = exports.CordovaTools || (exports.CordovaTools = {}));
