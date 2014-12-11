/// <reference path="Typings/node.d.ts" />
/// <reference path="TypeScript/tsc.d.ts" />
/// <reference path="RuleEngine.ts" />
var TSStyleCop;
(function (TSStyleCop) {
    /**
    * Class which runs on the command line and analyzes the files using the passed in command line settings
    */
    var App = (function () {
        /** The IO interface used to interact with the console & file system */
        //private _io: Object;
        /**
        * Initializes a new instance of the App class
        * @param io - The interface for integrating with the console & file system
        */
        function App() {
            var args = this.parseArgs(process.argv);
            var settings = {};

            if (args["config"]) {
                try  {
                    eval("settings = " + io.readFile(args["config"][0], null).contents);
                } catch (e) {
                    this.reportError("Unable to load config. " + e.message);
                    settings = {};
                }
            }

            if (args["autoCorrect"]) {
                settings.autoCorrect = true;
            }

            var ruleEngine = new TSStyleCop.RuleEngine(settings, this);

            var inputFilesOrDirs = args["analyze"];
            var filesToAnalyze = [];
            if (inputFilesOrDirs) {
                for (var i = 0; i < inputFilesOrDirs.length; i++) {
                    var inputFileOrDir = inputFilesOrDirs[i];
                    if (io.fileExists(inputFileOrDir)) {
                        filesToAnalyze.push(inputFileOrDir);
                    } else if (io.directoryExists(inputFileOrDir)) {
                        filesToAnalyze = filesToAnalyze.concat(io.dir(inputFileOrDir, /^.*.ts$/, { recursive: true }));
                    } else {
                        this.reportError("Input file or directory does not exist: " + inputFileOrDir);
                    }
                }
            }

            var excludedFiles = args["exclude"];
            var filteredFilesToAnalyze = filesToAnalyze;

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
                var fileInfo = io.readFile(filename, null);
                var autoCorrect = settings.autoCorrect && !App.isFileReadOnly(filename);
                var correctedText = ruleEngine.analyzeFile(filename, fileInfo.contents, autoCorrect);
                if (correctedText && correctedText !== fileInfo.contents) {
                    io.writeFile(filename, correctedText, !!fileInfo.byteOrderMark);
                }
            }

            io.quit(0);
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
        App.prototype.log = function (message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            this._io.printLine(this.createMSBuildMessage("information", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        };

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
        App.prototype.warning = function (message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            this._io.printLine(this.createMSBuildMessage("warning", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        };

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
        App.prototype.error = function (message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            this._io.printLine(this.createMSBuildMessage("error", message, code, filename, startLine, startCharacter, endLine, endCharacter));
        };

        /**
        * TypeScript's IO abstraction layer doesn't supply read-only info for files, so hacking it in here
        * @param filename The file name to check for read-only status
        * @returns True if the file is read only
        */
        App.isFileReadOnly = function (filename) {
            if (typeof WScript !== "undefined" && typeof ActiveXObject === "function") {
                try  {
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
        };

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
        App.prototype.createMSBuildMessage = function (type, message, code, filename, startLine, startCharacter, endLine, endCharacter) {
            return filename + "(" + startLine + "," + startCharacter + "," + endLine + "," + endCharacter + "): " + type + " " + code + ": " + message;
        };

        /**
        * Logs an error to the console
        */
        App.prototype.reportError = function (error) {
            this._io.printLine("error TSCOP: " + error);
        };

        /**
        * Parses the command line args in the form:
        *   (-key value*)*
        * @param args The command line args slpit by space
        * @returns The parsed args where the values after each key are grouped by their key
        */
        App.prototype.parseArgs = function (args) {
            var parsedArgs = {};
            var key = "";
            var list = parsedArgs[key] = [];
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
        };
        return App;
    })();
    TSStyleCop.App = App;
})(TSStyleCop || (TSStyleCop = {}));

if (process) {
    new TSStyleCop.App();
}
//# sourceMappingURL=App.js.map
