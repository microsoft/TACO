/// <reference path='..\scripts\typings\node.d.ts' />
/// <reference path='..\scripts\typings\typescript.d.ts' />

import child_process = require('child_process');
import path = require('path');
import fs = require('fs');
import ts = require('typescript');

module CordovaTools {

    /**
     * Compiler configuration interface.
     */
    export interface CompilerConfiguration {
        filesRoot: string;
        options: ts.CompilerOptions;
    }

    /**
     * In charge of invoking the typescript compiler.
     */
    export class TSCInvoker {

        private static DEFAULT_SOURCE_DIRECTORIES = 'www;merges';
        private static CONFIGURATION_FILE_PATH = '.\\hooks\\before_prepare\\compile-typescript\\tsc-config.json';
        private static DEFAULT_COMPILER_OPTIONS: CompilerConfiguration = {
            "filesRoot": "www;merges", "options": {
                target: ts.ScriptTarget.ES5,
                module: ts.ModuleKind.CommonJS
            }
        };

        /**
         * Compiles typescript files based on the provided compiler options.
         */
        private compileTypescript(options: ts.CompilerOptions, filenames: string[]): void {
            var host = ts.createCompilerHost(options);
            var program = ts.createProgram(filenames, options, host);
            var checker = ts.createTypeChecker(program, true);
            var result = checker.emitFiles();

            var allDiagnostics = program.getDiagnostics()
                .concat(checker.getDiagnostics())
                .concat(result.diagnostics);

            allDiagnostics.forEach(diagnostic => this.logDiagnosticMessage(diagnostic));

            if (result.emitResultStatus !== 0) {
                throw "Typescript compilation failed."
            }
            else {
                console.log("Compilation succeeded.");
            }
        }

        /**
         * Pretty-prints a diagnostic message to the console.
         */
        private logDiagnosticMessage(diagnostic: ts.Diagnostic): void {
            var sourceFile = diagnostic.file;
            var lineAndCharacter = sourceFile.getLineAndCharacterFromPosition(diagnostic.start);
            console.warn(sourceFile.filename + "("
                + lineAndCharacter.line + ","
                + lineAndCharacter.character + "): "
                + diagnostic.messageText);
        }

        /**
         * Compiles the typescript files in the project.
         */
        public compileProject(): void {
            console.log("\nReading configuration...");
            var configuration: CompilerConfiguration = this.readConfiguration();

            var sourceFiles: string[] = [];
            var projectDirectory = process.argv[2];

            /* Add the source files. */
            var sourceLocations = (configuration && configuration.filesRoot) ? configuration.filesRoot : TSCInvoker.DEFAULT_SOURCE_DIRECTORIES;
            console.log('\nSearching for typescript source files...');
            console.log('Searching the following location(s): ' + sourceLocations);

            var filesRootDirectories = sourceLocations.split(';');
            for (var i = 0; i < filesRootDirectories.length; i++) {
                this.getProjectTypescriptFiles(path.join(projectDirectory, filesRootDirectories[i]), sourceFiles);
            }

            console.log('Found typescript sources:');

            for (var i = 0; i < sourceFiles.length; i++) {
                console.log(sourceFiles[i]);
            }

            console.log('\nCompiling...');
            this.compileTypescript(configuration.options, sourceFiles);
        }

        /**
         * Reads the compiler configuration from the tsc-cofig.json file.
         */
        private readConfiguration(): CompilerConfiguration {
            var result: CompilerConfiguration = null;
            var configurationPath = path.join(process.argv[2], TSCInvoker.CONFIGURATION_FILE_PATH);

            /* try to read the adjacent configuration file */
            try {
                if (fs.existsSync(configurationPath)) {
                    var buffer = fs.readFileSync(TSCInvoker.CONFIGURATION_FILE_PATH);
                    if (buffer) {
                        result = JSON.parse(buffer.toString());
                        console.log("Configuration read from: " + configurationPath);
                    }
                }
            } catch (e) {
                console.warn("Configuration could not be read.");
            }

            if (result === null) {
                console.warn('Using default settings.');
                result = TSCInvoker.DEFAULT_COMPILER_OPTIONS;
            }

            return result;
        }

        /**
         * Recursively finds all the typescript files under the filesRoot path.
         */
        private getProjectTypescriptFiles(filesRoot: string, result: string[]) {
            if (fs.existsSync(filesRoot)) {
                var files = fs.readdirSync(filesRoot);
                for (var i = 0; i < files.length; i++) {
                    var currentPath = path.join(filesRoot, files[i]);
                    if (!fs.statSync(currentPath).isDirectory()) {
                        /* push the typescript files */
                        if (path.extname(currentPath) === '.ts') {
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
        }
    }
}

try {
    var compiler = new CordovaTools.TSCInvoker();
    compiler.compileProject();
} catch (e) {
    console.log('\nAn error occurred while compiling the typescript files: ' + e);
    process.exit(1);
}
