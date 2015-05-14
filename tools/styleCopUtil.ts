/// <reference path="../src/typings/node.d.ts" />
import child_process = require("child_process");
import fs = require ("fs");
import path = require ("path");

    /**
     * Utility for launching TS style cop as a child process.
     */
export class StyleCopUtil {
    private _errorMessage: string = "Style cop validation failed.";

    public runCop(srcPath: string, copPath: string, copConfig: string, cb: Function): void {
        var childProcessCallback = (error: Error, stdout: Buffer, stderr: Buffer): void => {
            if (stdout) {
                console.log(stdout);
                cb(this._errorMessage);
            }

            if (stderr) {
                console.error(stderr);
                cb(this._errorMessage);
            }

            if (error) {
                console.error(error);
                cb(this._errorMessage);
            }

            if (!stdout && !stderr && !error) {
                cb();
            }
        };

        var excludedFiles = this.getProjectTypescriptDefinitionFiles(srcPath, []);
        var styleCopCommand = "node " + copPath + " -analyze " + srcPath + (excludedFiles ? " -exclude " + excludedFiles.join(" ") : "") + " -config " + copConfig;
        child_process.exec(styleCopCommand, childProcessCallback);
    }

    /**
     * Recursively finds all the typescript files under the filesRoot path.
     */
    public getProjectTypescriptDefinitionFiles(filesRoot: string, result: string[]): string[] {
        if (fs.existsSync(filesRoot)) {
            var files = fs.readdirSync(filesRoot);
            for (var i = 0; i < files.length; i++) {
                var currentPath = path.join(filesRoot, files[i]);
                if (!fs.statSync(currentPath).isDirectory()) {
                    /* push the typescript files */
                    if (currentPath.match(/\.d\.ts$/)) {
                        result.push(path.basename(currentPath));
                    }
                } else {
                    /* call the function recursively for subdirectories */
                    this.getProjectTypescriptDefinitionFiles(currentPath, result);
                }
            }
        }

        return result;
    }
}
