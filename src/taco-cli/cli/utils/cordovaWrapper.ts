/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/cordovaExtensions.d.ts" />

import child_process = require ("child_process");
import Q = require ("q");
import path = require ("path");
import tacoUtility = require ("taco-utils");

import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaWrapper {
    private static CordovaModuleName: string = "cordova";
    public static cli(args: string[]): Q.Promise<any> {
        var deferred = Q.defer();
        var proc = child_process.exec([CordovaWrapper.CordovaModuleName].concat(args).join(" "), function (err: Error, stdout: Buffer, stderr: Buffer): void {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve({ stdout: stdout, stderr: stderr });
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