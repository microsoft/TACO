/// <reference path="../src/typings/node.d.ts" />
var child_process = require("child_process");
var fs = require("fs");
var path = require("path");
/**
 * Utility for launching TS style cop as a child process.
 */
var StyleCopUtil = (function () {
    function StyleCopUtil() {
        this._errorMessage = "Style cop validation failed.";
    }
    StyleCopUtil.prototype.runCop = function (srcPath, copPath, copConfig, cb) {
        var _this = this;
        var childProcessCallback = function (error, stdout, stderr) {
            if (stdout) {
                console.log(stdout);
                cb(_this._errorMessage);
            }
            if (stderr) {
                console.error(stderr);
                cb(_this._errorMessage);
            }
            if (error) {
                console.error(error);
                cb(_this._errorMessage);
            }
            if (!stdout && !stderr && !error) {
                cb();
            }
        };
        var excludedFiles = this.getProjectTypescriptDefinitionFiles(srcPath, []);
        var styleCopCommand = "node " + copPath + " -analyze " + srcPath + (excludedFiles ? " -exclude " + excludedFiles.join(" ") : "") + " -config " + copConfig;
        child_process.exec(styleCopCommand, childProcessCallback);
    };
    /**
     * Recursively finds all the typescript files under the filesRoot path.
     */
    StyleCopUtil.prototype.getProjectTypescriptDefinitionFiles = function (filesRoot, result) {
        if (fs.existsSync(filesRoot)) {
            var files = fs.readdirSync(filesRoot);
            for (var i = 0; i < files.length; i++) {
                var currentPath = path.join(filesRoot, files[i]);
                if (!fs.statSync(currentPath).isDirectory()) {
                    /* push the typescript files */
                    if (currentPath.match("d.ts$")) {
                        result.push(path.basename(currentPath));
                    }
                }
                else {
                    /* call the function recursively for subdirectories */
                    this.getProjectTypescriptDefinitionFiles(currentPath, result);
                }
            }
        }
        return result;
    };
    return StyleCopUtil;
})();
exports.StyleCopUtil = StyleCopUtil;
