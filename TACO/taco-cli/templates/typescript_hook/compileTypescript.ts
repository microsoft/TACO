/// <reference path='../../../typings/node/node.d.ts' />
/// <reference path='../../../utility/typescriptUtil.ts' />

import child_process = require ("child_process");
import path = require ("path");
import fs = require ("fs");
import ts = require ("typescript");

export module CordovaTools {
    /**
     * Compiler configuration interface.
     */
    interface ICompilerConfiguration {
        filesRoot: string;
        options: ts.CompilerOptions;
    }

    /**
     * In charge of invoking the typescript compiler.
     */
    export class TSCInvoker {
        private static DEFAULT_SOURCE_DIRECTORIES = "www;merges";
        private static CONFIGURATION_FILE_PATH = path.join("hooks", "before_prepare", "compile-typescript", "tsc-config.json");
        private static DEFAULT_COMPILER_OPTIONS: ICompilerConfiguration = {
            filesRoot: "www;merges",
            options: {
                target: ts.ScriptTarget.ES5,
                module: ts.ModuleKind.CommonJS
            }
        };

        private _compileCallback = (error: any) => {
            console.log("Compilation " + (error ? "failed" : "succeeded") + ".");
        };

        /**
         * Compiles the typescript files in the project.
         */
        public compileProject(): void {
            // TypescriptServices will be merged in the destination file
            var typeScriptServices: any = (<any>CordovaTools).TypescriptServices;
            var typescriptUtil = new typeScriptServices();

            console.log("\nReading configuration...");
            var configuration: ICompilerConfiguration = this.readConfiguration();

            var sourceFiles: string[] = [];
            var projectDirectory = process.argv[2];

            /* Add the source files. */
            var sourceLocations = (configuration && configuration.filesRoot) ? configuration.filesRoot : TSCInvoker.DEFAULT_SOURCE_DIRECTORIES;
            console.log("\nSearching for typescript source files...");
            console.log("Searching the following location(s): " + sourceLocations);

            var filesRootDirectories = sourceLocations.split(";");
            for (var i = 0; i < filesRootDirectories.length; i++) {
                typescriptUtil.getProjectTypescriptFiles(path.join(projectDirectory, filesRootDirectories[i]), sourceFiles);
            }

            console.log("Found typescript sources:");
            for (var i = 0; i < sourceFiles.length; i++) {
                console.log(sourceFiles[i]);
            }

            console.log("\nCompiling...");
            typescriptUtil.compileTypescript(configuration.options, sourceFiles, this._compileCallback);
        }

        /**
         * Reads the compiler configuration from the tsc-cofig.json file.
         */
        private readConfiguration(): ICompilerConfiguration {
            var result: ICompilerConfiguration;
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

            if (!result) {
                console.warn("Using default settings for typescript compilation.");
                result = TSCInvoker.DEFAULT_COMPILER_OPTIONS;
            }

            return result;
        }
    }
}

try {
    var compiler = new CordovaTools.TSCInvoker();
    compiler.compileProject();
} catch (e) {
    console.log("\nAn error occurred while compiling the typescript files: " + e);
    process.exit(1);
}
