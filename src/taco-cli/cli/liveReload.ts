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

    private static hookLiveReload(options: any, platforms: string[]): Q.Promise<any> {
        Logger.log("Setting up livereload ...");
        var projectRoot = ProjectHelper.getProjectRoot();
        return LiveReload.getTargetPlatforms(projectRoot, platforms)
            .then(targetPlatforms => {
                return CordovaHelper.tryInvokeCordova((cordova) => {

                    var startOptions: liveReload.LiveReloadOptions = {
                        ghostMode: !!options.devicesync,
                        tunnel: !!options.tunnel,
                        ignore: options.ignore,

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
                            return liveReload.start(projectRoot, targetPlatforms, startOptions);
                        }
                    });
                    return Q({});
                }, () => {
                    return Q.reject(new Error("live-reload is not supported for project without taco.json "));
                }, {});
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
