/// <reference path="..\scripts\typings\node.d.ts" />

import fs = require('fs');
import path = require('path');

export module CordovaTools {
    export class HookInstaller {

        private static HOOK_NAME: string = "compileTypescriptNode.js";

        /**
         * Copies a file from the source location path to the destination path.
         */
        private copyFile(sourcePath: string, destinationPath: string): void {
            if (!fs.existsSync(sourcePath)) {
                console.log("The file does not exist: " + sourcePath);
                return;
            }

            var readStream = fs.createReadStream(sourcePath);
            readStream.pipe(fs.createWriteStream(destinationPath));
            readStream.on('end', function () { console.log("\nHook installed."); });
        }

        /**
         * Installs the typescript compilation hook in a Cordova project from a specified source folder.
         */
        public installTypescriptHookFromFolder(hookSourceFolder: string, projectRootPath: string) {
            console.log("Hook source folder: " + hookSourceFolder);
            console.log("Project root path: " + projectRootPath);

            if (!fs.existsSync(projectRootPath)) {
                console.log("The project root path does not exist: " + projectRootPath);
                return;
            }

            if (!fs.existsSync(path.join(projectRootPath, './/www'))) {
                console.log("The provided directory is not a Cordova-based project.");
                return;
            }

            var hookDestinationFolder = path.join(projectRootPath, './/hooks//before_prepare');
            console.log("Hook destination folder: " + hookDestinationFolder);

            this.ensureFolder(path.join(projectRootPath, './/hooks'));
            this.ensureFolder(hookDestinationFolder);
            var hookPath = path.join(hookSourceFolder, HookInstaller.HOOK_NAME);
            console.log("Hook path: " + hookPath);

            this.copyFile(hookPath, path.join(hookDestinationFolder, HookInstaller.HOOK_NAME));
        }

        /**
         * Installs the hook from the current executing script folder.
         */
        public installTypescriptHook(projectRootPath: string) {
            var hookSourceFolder = path.dirname(process.argv[1]);
            this.installTypescriptHookFromFolder(hookSourceFolder, projectRootPath);
        }

        /**
         * Creates a folder if it does not exist.
         */
        private ensureFolder(path: string) {
            var folderExists = fs.existsSync(path);
            console.log("Folder " + path + " exists: " + folderExists);
            if (!folderExists) {
                console.log("Creating folder: " + path);
                fs.mkdirSync(path);
            }
        }
    }
}
