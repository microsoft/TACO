/// <reference path="../src/typings/typescript.d.ts" />

import ts = require ("typescript");
import fs = require ("fs");
import path = require ("path");

export module TacoUtils {
    export class TypescriptServices {
        private static FailureMessage = "Typescript compilation failed.";

        /**
         * Compiles typescript files based on the provided compiler options.
         */
        public compileTypescript(options: ts.CompilerOptions, filenames: string[], cb: Function): void {
            var host = ts.createCompilerHost(options);
            var program = ts.createProgram(filenames, options, host);
            var checker = ts.createTypeChecker(program, true);
            var result = checker.emitFiles();

            var allDiagnostics = program.getDiagnostics()
                .concat(checker.getDiagnostics())
                .concat(result.diagnostics);

            allDiagnostics.forEach(diagnostic => this.logDiagnosticMessage(diagnostic));

            if (result.emitResultStatus !== 0) {
                /* compilation failed */
                if (cb) {
                    cb(TypescriptServices.FailureMessage);
                }
            } else {
                /* compilation succeeded */
                cb();
            }
        }

        /**
         * Recursively finds all the typescript files under the filesRoot path.
         */
        public getProjectTypescriptFiles(filesRoot: string, result: string[]): string[] {
            if (fs.existsSync(filesRoot)) {
                var files = fs.readdirSync(filesRoot);
                for (var i = 0; i < files.length; i++) {
                    var currentPath = path.join(filesRoot, files[i]);
                    if (!fs.statSync(currentPath).isDirectory()) {
                        /* push the typescript files */
                        if (path.extname(currentPath) === ".ts" &&
                            !currentPath.match("d.ts$") &&
                            !currentPath.match("gulpfile.ts") &&
                            !currentPath.match("gulp-compile.ts")) {
                            result.push(currentPath);
                        }
                    } else {
                        /* call the function recursively for subdirectories */
                        this.getProjectTypescriptFiles(currentPath, result);
                    }
                }
            }

            return result;
        }

        /**
         * Compiles a diectory using the default settings, and the given source and destination location.
         */
        public compileDirectory(sourceDirectory: string, outputDirectory: string, cb: Function): void {            
            var sourceFiles = this.getProjectTypescriptFiles(sourceDirectory, []);                    

            this.compileTypescript({
                noImplicitAny: true,
                noEmitOnError: true,
                target: ts.ScriptTarget.ES5,
                module: ts.ModuleKind.CommonJS,
                outDir: outputDirectory
            }, sourceFiles, cb);
        }

        /**
         * Pretty-prints a diagnostic message to the console.
         */
        private logDiagnosticMessage(diagnostic: ts.Diagnostic): void {
            var sourceFile = diagnostic.file;
            var lineAndCharacter = sourceFile.getLineAndCharacterFromPosition(diagnostic.start);
            console.warn(sourceFile.filename + "(" + lineAndCharacter.line + "," + lineAndCharacter.character + "): " + diagnostic.messageText);
        }
    }
}
