/// <reference path="Typings/node.d.ts" />
/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="RuleEngine.ts" />

module TSStyleCop {
    /**
     * Class which runs on the command line and analyzes the files using the passed in command line settings
     */
    export class App implements IScriptHostAPI {
        /** The IO interface used to interact with the console & file system */
        //private _io: Object;

        /**
         * Initializes a new instance of the App class
         * @param io - The interface for integrating with the console & file system
         */
        constructor() {
            var fs = require('fs');
            var args = this.parseArgs(process.argv);
            var settings: IStyleSettings = {};

            if (args["config"]) {
                try {
                    eval("settings = " + fs.readFileSync(args["config"][0]).toString());
                } catch (e) {
                    this.reportError("Unable to load config. " + e.message);
                    settings = {};
                }
            }

            if (args["autoCorrect"]) {
                console.warn("\033[91m \n\nYou are running Style Cop with AUTOCORRECT enabled. This option is unstable on some versions of node and \
                    can lead to CODE LOSS. DID YOU BACK UP YOUR CODE? Please type \"yes\" to continue or press Enter to cancel. \033[0m \n");
                var BUF_SIZE = 256, buffer = new Buffer(BUF_SIZE);
                var rsize = fs.readSync((<any>process.stdin).fd, buffer, 0, BUF_SIZE);
                var answer = buffer.toString('utf8', 0, rsize);
                if (answer.substr(0, 3) != "yes") {
                    console.warn("User canceled style cop run.");
                    process.exit(0);
                }

                settings.autoCorrect = true;
            }

            var ruleEngine = new TSStyleCop.RuleEngine(settings, this);

            var inputFilesOrDirs: string[] = args["analyze"];
            var filesToAnalyze: string[] = [];
            if (inputFilesOrDirs) {
                for (var i = 0; i < inputFilesOrDirs.length; i++) {
                    var inputFileOrDir = inputFilesOrDirs[i];
                    if (fs.existsSync(inputFileOrDir) && !fs.statSync(inputFileOrDir).isDirectory()) {
                        filesToAnalyze.push(inputFileOrDir);
                    } else if (fs.existsSync(inputFileOrDir) && fs.statSync(inputFileOrDir).isDirectory()) {
                        filesToAnalyze = filesToAnalyze.concat(this.getProjectTypescriptFiles(inputFileOrDir, []));
                    } else {
                        this.reportError("Input file or directory does not exist: " + inputFileOrDir);
                    }
                }
            }

            var excludedFiles: string[] = args["exclude"];
            var filteredFilesToAnalyze: string[] = filesToAnalyze;

            if (excludedFiles) {
                for (var i = filesToAnalyze.length - 1; i >= 0; i--) {
                    var parts = filesToAnalyze[i].split(/[\/\\]/);
                    if (excludedFiles.indexOf(parts[parts.length - 1]) >= 0) {
                        filteredFilesToAnalyze.splice(i, 1);
                    }
                }
            }

            for (var i = 0; i < filesToAnalyze.length; i++) {
                var filename = filesToAnalyze[i];
                var fileContents = fs.readFileSync(filename).toString();
                var autoCorrect = settings.autoCorrect && !App.isFileReadOnly(filename);
                var correctedText = ruleEngine.analyzeFile(filename, fileContents, autoCorrect);
                if (correctedText && correctedText !== fileContents) {
                    fs.writeFileSync(filename, correctedText);
                }
            }

            var stderrFlushed = process.stderr.write('');
            var stdoutFlushed = process.stdout.write('');
            process.stderr.on('drain', function () {
                stderrFlushed = true;
                if (stdoutFlushed) {
                    process.exit(0);
                }
            });
            process.stdout.on('drain', function () {
                stdoutFlushed = true;
                if (stderrFlushed) {
                    process.exit(0);
                }
            });
            setTimeout(function () {
                process.exit(0);
            }, 5);
        }

        /**
         * Logs an informational message
         * @param message The message to log
         * @param code The message's code
         * @param filename The name of the file
         * @param startLine The start line
         * @param startCharacter The start character
         * @param endLine The end line
         * @param endCharacter The end character
         */
        public log(message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): void {
            console.log(this.createMSBuildMessage("information", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        }

        /**
         * Logs a warning message
         * @param message The message to log
         * @param code The message's code
         * @param filename The name of the file
         * @param startLine The start line
         * @param startCharacter The start character
         * @param endLine The end line
         * @param endCharacter The end character
         */
        public warning(message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): void {
            console.log(this.createMSBuildMessage("warning", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        }

        /**
         * Logs an error message
         * @param message The message to log
         * @param code The message's code
         * @param filename The name of the file
         * @param startLine The start line
         * @param startCharacter The start character
         * @param endLine The end line
         * @param endCharacter The end character
         */
        public error(message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): void {
            console.log(this.createMSBuildMessage("error", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        }

        /**
         * TypeScript's IO abstraction layer doesn't supply read-only info for files, so hacking it in here
         * @param filename The file name to check for read-only status
         * @returns True if the file is read only
         */
        private static isFileReadOnly(filename: string): boolean {
            if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
                try {
                    var fso = new ActiveXObject("Scripting.FileSystemObject");
                    var file = fso.GetFile(filename);
                    return !!(file.Attributes & 1);
                } catch (e) {
                    return true;
                }
            } else {
                var fs = require("fs");
                var stats = fs.statSync(filename);
                return !(stats.mode & 2);
            }
        }

        /**
         * Creates a message in a format supported by MSBuild
         * @param type The message type: "error" "warning" or "information"
         * @param message The message to log
         * @param code The message's code
         * @param filename The name of the file
         * @param startLine The start line
         * @param startCharacter The start character
         * @param endLine The end line
         * @param endCharacter The end character
         */
        private createMSBuildMessage(type: string, message: string, code: string, filename: string, startLine: number, startCharacter: number, endLine: number, endCharacter: number): string {
            return filename + "(" + startLine + "," + startCharacter + "," + endLine + "," + endCharacter + "): " + type + " " + code + ": " + message;
        }

        /**
         * Logs an error to the console
         */
        private reportError(error: string): void {
            console.log("error TSCOP: " + error);
        }

        /**
         * Parses the command line args in the form:
         *   (-key value*)*
         * @param args The command line args slpit by space
         * @returns The parsed args where the values after each key are grouped by their key
         */
        private parseArgs(args: string[]): { [key: string]: string[]; } {
            var parsedArgs: { [key: string]: string[]; } = {};
            var key = "";
            var list: string[] = parsedArgs[key] = [];
            for (var i = 0; i < args.length; i++) {
                var arg = args[i];
                if (arg.charAt(0) === "-") {
                    key = arg.substr(1);
                    list = parsedArgs[key];
                    if (!list) {
                        list = parsedArgs[key] = [];
                    }
                } else {
                    list.push(arg);
                }
            }

            return parsedArgs;
        }

        /**
         * Recursively finds all the typescript files under the filesRoot path.
         */
        private getProjectTypescriptFiles(filesRoot: string, result: string[]) {
            var fs = require('fs');
            var path = require('path');

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

if (process) {
    new TSStyleCop.App();
}
