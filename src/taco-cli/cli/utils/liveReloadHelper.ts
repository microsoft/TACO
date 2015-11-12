/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/cordovaExtensions.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/cordova-plugin-livereload.d.ts" />

"use strict"

import Q = require("q");
import deviceSync = require("cordova-plugin-livereload");
import tacoUtility = require("taco-utils");
import projectHelper = require("./projectHelper");
import path = require("path");

import packageLoader = tacoUtility.TacoPackageLoader;
import commands = tacoUtility.Commands;
import patcher = deviceSync.Patcher;
import logger = tacoUtility.Logger;

// Rework on the naming
class LiveReloadHelper {

    public static isLiveReload(commandData: commands.ICommandData): boolean {
        return !!commandData.options["livereload"] || !!commandData.options["devicesync"];
    }

    public static setupLiveReload(cordova: Cordova.ICordova, options: any): void {
        cordova.on("after_prepare", function() {
            // declare typings for the livereload package
            // update livereload.js inside the cordova-plugin-livereload
            // expose deviceSync.stopLiveReload();
            var projectRoot = projectHelper.getProjectRoot(); 
            var ds = deviceSync.startLiveReload({
                files: [{
                    match: [path.join(projectRoot, "www", "**/*.*")],
                    fn: function(event: any, file: any): Q.Promise<any> {
                        // After a file changes, first run `cordova prepare`, then reload.
                        return cordova.raw.prepare({platforms: []}).then(function(): Q.Promise<any> { // test this: platforms -> empty array
                            // Remove CSP directive from HTML
                            // Move this into Patcher design
                            // Patcher.patch(...);
                            // platform_wwws.forEach(function(platWWWDir) {
                            //     var platformIndexLocal = path.join(platWWWDir, startPage);
                            //     var remover = new CSPRemover(platformIndexLocal);
                            //     remover.Remove();
                            // });
                            // return Q();
                            return patcher.Patch(projectRoot);
                        }).then(function(): Q.Promise<any> {
                            if (event === "change") {
                                return ds.reload(file);
                            }

                            // If new files got added or deleted, reload the whole app instead of specific files only
                            // e.g: index.html references a logo file 'img/logo.png'
                            // deleting the 'img/logo.png' file will trigger a reload that will remove it from the rendered app
                            // likewise, adding the 'img/logo.png' file will trigger it to be shown on the app
                            return ds.reload();
                        }).fail(function(err: any) {
                            var msg = " - An error occurred: " + err;
                            logger.log(msg);
                            ds.stopLiveReload();
                            // rethrow
                        });
                    }
                }],
                watchOptions: {

                    // If user specified files/folders to ignore (via `cordova run android -- --livereload --ignore=build/**/*.*`), ignore those files
                    // ... Otherwise, don't ignore any files (That's the default). The function below achieves that goal.
                    ignored: options.ignoreOption || function(str: any) {
                        return false;
                    },

                    // Ignore the initial add events .
                    // Don't run prepare on the initial addition of files,
                    // Only do it on subsequent ones
                    ignoreInitial: true
                },
                tunnel: options.tunnel || false,
                ghostMode: options.ghostMode || true
            });
        });

        cordova.on("livereload_started", function() {
            console.log("LiveReload Started");
        });
    }
}

export = LiveReloadHelper;