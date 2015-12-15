/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoLiveReload.d.ts" />


"use strict";

import Q = require ("q");

import tacoUtility = require ("taco-utils");
import liveReload = require("taco-livereload");

import Commands = tacoUtility.Commands;
import Logger = tacoUtility.Logger;
import ProjectHelper = tacoUtility.ProjectHelper;
import CordovaHelper = tacoUtility.CordovaHelper;
/**
 * Run
 *
 * handles "taco run"
 */
class LiveReload {
    public static startLiveReload(liveReloadEnabled: boolean, devicesync: boolean, platforms?: string[], ignore?: string): Q.Promise<any> {
        var projectRoot = ProjectHelper.getProjectRoot();
        return LiveReload.getTargetPlatforms(projectRoot, platforms)
            .then(targetPlatforms => {
                return CordovaHelper.tryInvokeCordova((cordova) => {

                    var options: liveReload.LiveReloadOptions = {
                        ghostMode: devicesync,
                        ignore: ignore,

                        cb: function(event: string, file: string, lrHandle: liveReload.LiveReloadHandle) {
                        
                            // After a file changes, first run `cordova prepare`, then reload.
                            return cordova.raw.prepare().then(function() {
                                var patcher = new liveReload.Patcher(projectRoot, targetPlatforms);
                                return patcher.removeCSP();
                            }).then(function() {
                                if (event === 'change') {
                                    return lrHandle.tryReloadingFile(file);
                                }
                        
                                // If new files got added or deleted, reload the whole app instead of specific files only
                                // e.g: index.html references a logo file 'img/logo.png'
                                // deleting the 'img/logo.png' file will trigger a reload that will remove it from the rendered app
                                // likewise, adding the 'img/logo.png' file will trigger it to be shown on the app
                                return lrHandle.reloadBrowsers();
                            }).fail(function(err) {
                                var msg = ' - An error occurred: ' + err;
                                Logger.log(msg);
                                lrHandle.stop();
                            });
                        }
                    };

                    liveReload.on("livereload:error", function(err) {
                        Logger.log("TACO Livereload Error occured: - " + err);
                    });
            
                    // Display prompt to the user letting them know that livereload has started
                    // Note: we do it this way because doing it after `lr.start()`, it would get lost
                    //          among all the run command details output.
                    cordova.on("after_run", function() {
                        if (liveReload.isLiveReloadActive()) {
                            Logger.logLine();
                            Logger.log("TACO Live Reload started.");
                            Logger.logLine();
                            Logger.log("Press CTRL+C to exit");
                        }
                    });

                    cordova.on("after_prepare", function() {
                        if (!liveReload.isLiveReloadActive()) {
                            return liveReload.start(projectRoot, targetPlatforms, options);
                        }
                    });
                }, () => Logger.log("Unsupported for non-taco projects "), {});
            });
    }

    private static getTargetPlatforms(projectRoot: string, platforms: string[]): Q.Promise<string[]> {
        if (platforms && platforms.length > 0) {
            return Q(platforms);
        }
        return ProjectHelper.getInstalledComponents(projectRoot, "platforms");
    }
}
export = LiveReload;
