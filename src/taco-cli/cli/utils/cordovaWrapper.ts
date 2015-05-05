/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/cordovaExtensions.d.ts" />

import child_process = require ("child_process");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import resources = require ("../../resources/resourceManager");
import tacoUtility = require ("taco-utils");

import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaWrapper {
    private static CordovaCommandName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";
    private static CordovaNpmPackageName: string = "cordova";

    /**
     * Prepare the cordovaConfig parameter. This logic is taken directly from cordova and adapted to our CLI.
     */
    private static prepareCordovaConfig(parameters: CordovaWrapper.ICordovaCreateParameters): void {
        /*
        Re-implementation of:

        var cfg = {};
        // If we got a fourth parameter, consider it to be JSON to init the config.
        if (undashed[4]) {
            cfg = JSON.parse(undashed[4]);
        }
        var customWww = args['copy-from'] || args['link-to'];
        if (customWww) {
            if (customWww.indexOf('http') === 0) {
                throw new CordovaError(
                    'Only local paths for custom www assets are supported.'
                    );
            }
            if (customWww.substr(0, 1) === '~') {  // resolve tilde in a naive way.
                customWww = path.join(process.env.HOME, customWww.substr(1));
            }
            customWww = path.resolve(customWww);
            var wwwCfg = { url: customWww };
            if (args['link-to']) {
                wwwCfg.link = true;
            }
            cfg.lib = cfg.lib || {};
            cfg.lib.www = wwwCfg;
        }

        */

        var config: CordovaWrapper.ICordovaConfigMetadata = {};

        // Verify if user specified a cordovaConfig parameter on the command line
        if (parameters.cordovaConfig) {
            config = JSON.parse(parameters.cordovaConfig);
        }

        // If the user specified custom www assets, adjust the cordovaConfig
        var customWww = parameters.copyFrom || parameters.linkTo;

        if (customWww) {
            if (customWww.indexOf("http") === 0) {
                throw new Error(resources.getString("command.create.onlyLocalCustomWww"));
            }

            // Resolve HOME env path
            if (customWww.substr(0, 1) === "~") {
                customWww = path.join(process.env.HOME, customWww.substr(1));
            }

            customWww = path.resolve(customWww);

            var wwwCfg: CordovaWrapper.ICordovaLibMetadata = { url: customWww };

            if (parameters.linkTo) {
                wwwCfg.link = true;
            }

            config.lib = config.lib || {};
            config.lib.www = wwwCfg;
        }

        parameters.cordovaConfig = config;
    }

    public static cli(args: string[]): Q.Promise<any> {
        var deferred = Q.defer();
        var proc = child_process.spawn(CordovaWrapper.CordovaCommandName, args, { stdio: "inherit" });
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
    public static create(cordovaCli: string, cordovaParameters: CordovaWrapper.ICordovaCreateParameters): Q.Promise<any> {
        return packageLoader.lazyRequire(CordovaWrapper.CordovaNpmPackageName, cordovaCli)
            .then(function (cordova: Cordova.ICordova): Q.Promise<any> {
            CordovaWrapper.prepareCordovaConfig(cordovaParameters);

            return cordova.raw.create(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName, cordovaParameters.cordovaConfig);
        });
    }
}

module CordovaWrapper {
    /* 
     * Interfaces for the cordova create command
     */
    export interface ICordovaLibMetadata {
        url?: string;
        version?: string;
        id?: string;
        link?: boolean;
    }

    export interface ICordovaConfigMetadata {
        id?: string;
        name?: string;
        lib?: {
            www?: ICordovaLibMetadata;
        };
    }

    export interface ICordovaCreateParameters {
        projectPath: string;
        appId: string;
        appName: string;
        cordovaConfig: any;
        copyFrom?: string;
        linkTo?: string;
    }
}

export = CordovaWrapper;