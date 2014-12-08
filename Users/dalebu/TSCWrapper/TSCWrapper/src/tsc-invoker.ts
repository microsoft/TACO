/// <reference path='..\scripts\typings\node.d.ts' />

import child_process = require('child_process');
import path = require('path');
import fs = require('fs');

module CordovaTools {

    /**
     * Compiler configuration interface.
     */
    export interface CompilerConfiguration {
        filesRoot: string;
        options: any;
    }

    /**
     * In charge of invoking the typescript compiler.
     */
    export class TSCInvoker {

        private static DEFAULT_SOURCE_DIRECTORIES = 'www;merges';
        private static CONFIGURATION_FILE_PATH = '.\\hooks\\compile-typescript\\tsc-config.json';

        /**
         * Compiles the typescript files found in the project.
         */
        public compileTypescriptShell() {

            var tsCompileCommand = this.composeCompileCommand();
            console.log('\nInvoking typescript compiler...');
            console.log(tsCompileCommand);

            child_process.exec(tsCompileCommand, function (error: any, stdout: any, stderr: any) {
                if (stdout) {
                    console.log('\n' + stdout);
                }

                if (stderr) {
                    console.log('\n' + stderr);
                    process.exit(1);
                }

                if (error !== null) {
                    console.log('\n' + error);
                    process.exit(1);
                }
            });
        }

        //public compileTypescriptInternal() {
            ////var ts = require(path.join(process.argv[2], TSCInvoker.TYPESCRIPT_INTERNAL_COMPILER_PATH));
            //var ts = require(path.join(process.argv[2], ".\\hooks\\typescript\\tsc.js"));
            //ts.executeCommandLine(["c:\\Users\\dalebu\\Desktop\\tscordova\\sampleproject\\www\\js\\index.ts"]);
        //}

        /**
         * Composes the typescript compiler command.
         */
        private composeCompileCommand(): string {
            var configuration: CompilerConfiguration = this.readConfiguration();

            var compilerOptions = '';
            var sourceFiles: string[] = [];
            var projectDirectory = process.argv[2];

            /* Add the compiler options. */
            if (configuration && configuration.options) {
                for (var option in configuration.options) {
                    compilerOptions += ' --' + option;
                    if (configuration.options[option] !== '') {
                        compilerOptions += ' ' + configuration.options[option];
                    }
                }
            }

            /* Add the source files. */
            var sourceLocations = (configuration && configuration.filesRoot) ? configuration.filesRoot : TSCInvoker.DEFAULT_SOURCE_DIRECTORIES;
            console.log('\nSearching for typescript source files...');
            console.log('Searching the following location(s): ' + sourceLocations);

            var filesRootDirectories = sourceLocations.split(';');
            for (var i = 0; i < filesRootDirectories.length; i++) {
                this.getProjectTypescriptFiles(path.join(projectDirectory, filesRootDirectories[i]), sourceFiles);
            }

            console.log('Found typescript sources:');

            var filesArgument = '';
            for (var i = 0; i < sourceFiles.length; i++) {
                console.log(sourceFiles[i]);
                filesArgument += ' ' + sourceFiles[i];
            }

            return 'tsc ' + compilerOptions + filesArgument;
        }

        /**
         * Reads the compiler configuration from the tsc-cofig.json file.
         */
        private readConfiguration(): CompilerConfiguration {
            var result: CompilerConfiguration = null;

            /* try to read the adjacent configuration file */
            if (fs.existsSync(TSCInvoker.CONFIGURATION_FILE_PATH)) {
                var buffer = fs.readFileSync(TSCInvoker.CONFIGURATION_FILE_PATH);
                if (buffer) {
                    result = JSON.parse(buffer.toString());
                }
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

/* Export the functionality. */
//module.exports.compileTypescript = function () {
    try {
        var compiler = new CordovaTools.TSCInvoker();
        compiler.compileTypescriptShell();
    } catch (e) {
        console.log('\nAn error occurred while compiling the typescript files: ' + e);
        process.exit(1);
    }
//};
