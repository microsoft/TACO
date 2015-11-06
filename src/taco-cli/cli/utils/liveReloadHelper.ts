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
import tacoUtility = require("taco-utils");
import projectHelper = require("./projectHelper");
import path = require("path");
import lr = require("cordova-plugin-livereload");
import packageLoader = tacoUtility.TacoPackageLoader;
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import PlatformHelper = require("./platformHelper");


/**
 *  A Helper class that allows us to interact with the LiveReload NPM package.
 */
// ToDO: how to handle multiple plats ?
// ToDO: what if user tries to livereload unsupported platform ?
// ToDO: what if user tries to livereload supported + unsupported 
// ToDO: what if user tries to livereload a platform that he hasn't yet added ? => cordova should ideally catch this, but it seems like it isn't
//               e.g: taco-dev run android ios --livereload
class LiveReloadHelper {

    public static isLiveReload(commandData: commands.ICommandData): boolean {
        return !!commandData.options["livereload"] || !!commandData.options["devicesync"];
    }

    public static setupLiveReload(cordova: Cordova.ICordova, commandData: commands.ICommandData): Q.Promise<any> {

        var projectRoot = projectHelper.getProjectRoot();

        return PlatformHelper.determinePlatform(commandData).then(function(platformsWithLocation) {
            var platforms = platformsWithLocation.map(function(p) {
                return p.platform;
            });

            var options: lr.LiveReloadOptions = {
                ghostMode: !!commandData.options["devicesync"],
                ignore: 'build/**/*.*', //commandData.options["ignore"] // ToDO: test all other options; ToDO: pass all options from user to here
            
                cb: function(event: string, file: string, lrHandle: lr.LiveReloadHandle) {

                    // After a file changes, first run `cordova prepare`, then reload.
                    return cordova.raw.prepare().then(function() {
                        var patcher = new lr.Patcher(projectRoot, platforms);
                        return patcher.removeCSP();
                    }).then(function() {
                        if (event === 'change') {
                            return lrHandle.reloadFile(file);
                        }

                        // If new files got added or deleted, reload the whole app instead of specific files only
                        // e.g: index.html references a logo file 'img/logo.png'
                        // deleting the 'img/logo.png' file will trigger a reload that will remove it from the rendered app
                        // likewise, adding the 'img/logo.png' file will trigger it to be shown on the app
                        return lrHandle.reloadBrowsers();
                    }).fail(function(err) {
                        var msg = ' - An error occurred: ' + err;
                        logger.log(msg);
                        lrHandle.stop();
                    });
                }
            };

            lr.on("livereload:error", function(err) {
                logger.log("Error occured: - " + err);
            });

            // Display prompt to the user letting them know that livereload has started
            // Note: we do it this way because doing it after `lr.start()`, it would get lost
            //          among all the run command details output.
            cordova.on("after_run", function() {
                if (lr.isLiveReloadActive()) {
                    logger.log("\n" + "TACO Live Reload started." + "\n" + "Press CTRL+C to exit");
                }
            });

            return lr.start(projectRoot, platforms, options);
        });
    }
}

export = LiveReloadHelper;