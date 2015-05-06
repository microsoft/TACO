"use strict";

import path = require ("path");

import resources = require ("../../resources/resourceManager");

module CordovaHelper {
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

class CordovaHelper {
    /**
     * Prepare the cordovaConfig parameter. This logic is taken directly from cordova and adapted to our CLI.
     */
    public static prepareCordovaConfig(parameters: CordovaHelper.ICordovaCreateParameters): void {
        /*
        Re-implementation of Cordova's code:

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

        var config: CordovaHelper.ICordovaConfigMetadata = {};

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

            var wwwCfg: CordovaHelper.ICordovaLibMetadata = { url: customWww };

            if (parameters.linkTo) {
                wwwCfg.link = true;
            }

            config.lib = config.lib || {};
            config.lib.www = wwwCfg;
        }

        parameters.cordovaConfig = config;
    }
}

export = CordovaHelper;