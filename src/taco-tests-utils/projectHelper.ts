/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

"use strict";

/* tslint:disable:no-var-requires */
// var require needed for should module to work correctly
// Note not import: We don't want to refer to shouldModule, but we need the require to occur since it modifies the prototype of Object.
var shouldModule: any = require("should");
/* tslint:enable:no-var-requires */

import child_process = require ("child_process");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");

module TacoTestsUtils {
    interface IKeyValuePair<T> {
        [key: string]: T;
    }

    export class ProjectHelper {
        public static checkPlatformVersions(platformsExpected: IKeyValuePair<string>, projectPath: string): Q.Promise<any> {
            var platformsInstalled: string[] = ProjectHelper.getInstalledPlatforms(platformsExpected, projectPath);
            var onWindows: boolean = process.platform === "win32";
            return Q.all(platformsInstalled.map(function(platform: string): Q.Promise<any> {
                var deferred: Q.Deferred<any> = Q.defer<any>();
                var cmdName: string = "version";
                if (onWindows) {
                    cmdName = cmdName + ".bat";
                }

                var cmdPath: string = path.join(projectPath, "platforms", platform, "cordova", cmdName);
                var versionProc: child_process.ChildProcess = child_process.spawn(cmdPath);
                versionProc.stdout.on("data", function(data: any): void {
                    var version: string = data.toString();
                    if (!version) {
                        deferred.reject("Verson string not found");
                    } else {
                        should.assert(version.trim() === platformsExpected[platform], "Unexpected platform version");
                        deferred.resolve({});
                    }
                });
                versionProc.on("close", function(code: number): void {
                    deferred.reject("Unable to find version string");
                });
                versionProc.on("error", function(err: any): void {
                    deferred.reject(err);
                });
                return deferred.promise;
            }));
        }

        public static checkPluginVersions(pluginsExpected: IKeyValuePair<string>, projectPath: string): void {
            Object.keys(pluginsExpected).forEach(function(plugin: string): void {
                var versionInstalled: string = ProjectHelper.getInstalledPluginVersion(plugin, projectPath);
                versionInstalled.trim().should.be.equal(pluginsExpected[plugin]);
            });
        }

        private static getInstalledPlatforms(platformsExpected: IKeyValuePair<string>, projectPath: string): string[] {
            var platformsDir: string = path.join(projectPath, "platforms");
            if (!fs.existsSync(platformsDir)) {
                return [];
            }

            return fs.readdirSync(platformsDir).filter(function(platform: string): boolean {
                return Object.keys(platformsExpected).indexOf(platform) > -1;
            });
        }

        private static getInstalledPluginVersion(plugin: string, projectPath: string): string {
            var pluginPackgeJson: string = path.join(projectPath, "plugins", plugin, "package.json");
            if (fs.existsSync(pluginPackgeJson)) {
                var pluginInfo: any = require(pluginPackgeJson);
                if (pluginInfo) {
                    return pluginInfo["version"];
                }
            }

            return "";
        }
    }
}

export = TacoTestsUtils;
