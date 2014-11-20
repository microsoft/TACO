/// <reference path="..\Scripts\typings\node\node.d.ts" />
var CordovaTools;
(function (CordovaTools) {
    

    /**
    * In charge of invoking the typescript compiler.
    */
    var TSCInvoker = (function () {
        function TSCInvoker() {
        }
        /**
        * Compiles the typescript files found in the project.
        */
        TSCInvoker.prototype.compileTypescript = function () {
            var exec = require('child_process').exec;

            var tsCompileCommand = this.composeCompileCommand();
            console.log('\nInvoking typescript compiler...');
            console.log(tsCompileCommand);

            exec(tsCompileCommand, function (error, stdout, stderr) {
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
        };

        /**
        * Composes the typescript compiler command.
        */
        TSCInvoker.prototype.composeCompileCommand = function () {
            var path = require('path');
            var configuration = this.readConfiguration();

            var compilerOptions = "";
            var sourceFiles = [];
            var projectDirectory = process.argv[2];

            /* Add the compiler options. */
            if (configuration && configuration.options) {
                for (var option in configuration.options) {
                    compilerOptions += " --" + option;
                    if (configuration.options[option] !== "") {
                        compilerOptions += " " + configuration.options[option];
                    }
                }
            }

            /* Add the source files. */
            var sourceLocations = (configuration && configuration.filesRoot) ? configuration.filesRoot : TSCInvoker.DEFAULT_SOURCE_DIRECTORIES;
            console.log("\nSearching for typescript source files...");
            console.log("Searching the following location(s): " + sourceLocations);

            var filesRootDirectories = sourceLocations.split(';');
            for (var i = 0; i < filesRootDirectories.length; i++) {
                this.getProjectTypescriptFiles(path.join(projectDirectory, filesRootDirectories[i]), sourceFiles);
            }

            console.log("Found typescript sources:");

            var filesArgument = '';
            for (var i = 0; i < sourceFiles.length; i++) {
                console.log(sourceFiles[i]);
                filesArgument += ' ' + sourceFiles[i];
            }

            return 'tsc ' + compilerOptions + filesArgument;
        };

        /**
        * Reads the compiler configuration from the tsc-cofig.json file.
        */
        TSCInvoker.prototype.readConfiguration = function () {
            var result = null;

            /* try to read the adjacent configuration file */
            var fs = require('fs');

            if (fs.existsSync(TSCInvoker.CONFIGURATION_FILE_PATH)) {
                var buffer = fs.readFileSync(TSCInvoker.CONFIGURATION_FILE_PATH);
                if (buffer) {
                    result = JSON.parse(buffer.toString());
                }
            }

            return result;
        };

        /**
        * Recursively finds all the typescript files under the filesRoot path.
        */
        TSCInvoker.prototype.getProjectTypescriptFiles = function (filesRoot, result) {
            var fileSystem = require('fs');
            var path = require('path');

            if (fileSystem.existsSync(filesRoot)) {
                var files = fileSystem.readdirSync(filesRoot);
                for (var i = 0; i < files.length; i++) {
                    var currentPath = path.join(filesRoot, files[i]);
                    if (!fileSystem.statSync(currentPath).isDirectory()) {
                        /* push the typescript files */
                        if (path.extname(currentPath) === ".ts") {
                            result.push(currentPath);
                        }
                    } else {
                        /* call the function recursively for subdirectories */
                        this.getProjectTypescriptFiles(currentPath, result);
                    }
                }
            }

            return result;
        };
        TSCInvoker.DEFAULT_SOURCE_DIRECTORIES = "www;merges";
        TSCInvoker.CONFIGURATION_FILE_PATH = '.\\hooks\\ts-compile-hook\\tsc-config.json';
        return TSCInvoker;
    })();
    CordovaTools.TSCInvoker = TSCInvoker;
})(CordovaTools || (CordovaTools = {}));

/* Export the functionality. */
module.exports.compileTypescript = function () {
    try  {
        var compiler = new CordovaTools.TSCInvoker();
        compiler.compileTypescript();
    } catch (e) {
        console.log("\nAn error occurred while compiling the typescript files: " + e);
        process.exit(1);
    }
};
