/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/cordovaExtensions.d.ts" />

import child_process = require ("child_process");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import tacoUtility = require ("taco-utils");
import util = require ("util");

import packageLoader = tacoUtility.TacoPackageLoader;

import resources = require ("../../resources/resourceManager");

class CordovaWrapper {
    private static CordovaModuleName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    public static cli(args: string[]): Q.Promise<any> {
        var deferred = Q.defer();
        var proc = child_process.spawn(CordovaWrapper.CordovaModuleName, args, { stdio: "inherit" });
        proc.on("error", function (err: Error): void {
            deferred.reject(err);
        });
        proc.on("close", function (code: number): void {
            if (code) {
                deferred.reject(new Error(resources.getString("CordovaCommandFailed", code, args.join(" "))));
            } else {
                deferred.resolve({});
            }
        });
        return deferred.promise;
    }

    public static build(platform: string): Q.Promise<any> {
        return CordovaWrapper.cli(["build", platform]);
    }

    /**
     * Wrapper for 'cordova create' command.
     *
     * @param {string} The ID of the kit to use
     * @param {string} The path of the project to create
     * @param {string} The id of the app
     * @param {string} The name of app
     * @param {string} A JSON string whose key/value pairs will be added to the cordova config file in <project path>/.cordova/
     * @param {[option: string]: any} Bag of option flags for the 'cordova create' command
     *
     * @return {Q.Promise<any>} An empty promise
     */
    public static create(cordovaCli: string, projectPath: string, id?: string, name?: string, cdvConfig?: string, options?: { [option: string]: any }): Q.Promise<any> {
        var deferred = Q.defer();
        try {
            return packageLoader.lazyRequire("cordova", cordovaCli).then(function (cordova: Cordova.ICordova): Q.Promise<any> {
                return cordova.raw.create(projectPath, id, name, cdvConfig);
            });
        } catch (e) {
            deferred.reject(e);
        }

        return deferred.promise;
    }
}

export = CordovaWrapper;