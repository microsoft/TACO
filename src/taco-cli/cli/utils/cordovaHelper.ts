/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";

import path = require ("path");

import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;

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
    // Cordova's known parameters
    private static booleanParameters =
    {
        'verbose': Boolean
        , 'version': Boolean
        , 'help': Boolean
        , 'silent': Boolean
        , 'experimental': Boolean
        , 'noregistry': Boolean
        , 'shrinkwrap': Boolean
        , 'usegit': Boolean
        , 'link': Boolean
        , 'debug': Boolean
        , 'release': Boolean
        , 'device': Boolean
        , 'emulator': Boolean
        , 'browserify': Boolean
        , 'nobuild': Boolean
        , 'list': Boolean
    };
    private static valueParameters =
    {
        'copy-from': String
        , 'link-to': path
        , 'searchpath': String
        , 'variable': Array
        , 'archs': String
        , 'target': String
    };

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
                throw errorHelper.get(TacoErrorCodes.CommandCreateOnlyLocalCustomWww);
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

    /**
     * Given a command line to Taco, construct a command line for Cordova with the same specified parameters
     * Note that this assumes that all arguments after a "--" are not for this command, but something else and so should be passed on.
     * With a command like "taco build --debug --remote -- ios android" this assumption isn't quite true
     */
    public static marshallCordovaCliArguments(commandData: commands.ICommandData): string[] {
        var cordovaArgs: string[] = [];
        Object.keys(CordovaHelper.booleanParameters).forEach(function (key: string): void {
            if (commandData.options[key]) {
                cordovaArgs.push("--" + key);
            }
        });
        Object.keys(CordovaHelper.valueParameters).forEach(function (key: string): void {
            if(commandData.options[key]) {
                cordovaArgs.push("--" + key);
                cordovaArgs.push(commandData.options[key]);
            }
        });

        // Append all arguments after and including a lone "--"
        var additionalArguments: string[] = commandData.original.indexOf("--") >= 0 ? commandData.original.slice(commandData.original.indexOf("--")) : [];
        return cordovaArgs.concat(additionalArguments);
    }

    /**
     * Construct the options for programatically calling emulate, build, parepare, compile, or run via cordova.raw.X
     */
    public static mashallCordovaRawArguments(platform: string, commandData: commands.ICommandData): Cordova.ICordovaRawOptions {
        var opts: Cordova.ICordovaRawOptions = {
            platforms: [platform],
            options: [],
            verbose: commandData.options["verbose"] || false,
            silent: commandData.options["silent"] || false,
            browserify: commandData.options["browserify"] || false
        }

        // Reconstruct the args to be passed along to platform scripts.
        // This is an ugly temporary fix. The code spawning or otherwise
        // calling into platform code should be dealing with this based
        // on the parsed args object.
        var downstreamArgs: string[] = [];
        var argNames =
            ['debug'
            , 'release'
            , 'device'
            , 'emulator'
            , 'nobuild'
            , 'list'
            ];
        argNames.forEach(function (flag) {
            if (commandData.options[flag]) {
                downstreamArgs.push('--' + flag);
            }
        });

        if (commandData.options["target"]) {
            downstreamArgs.push('--target=' + commandData.options["target"]);
        }
        if (commandData.options["archs"]) {
            downstreamArgs.push('--archs=' + commandData.options["archs"]);
        }
        // Include all arguments after, but not including, a lone "--"
        var additionalArguments: string[] = commandData.original.indexOf("--") >= 0 ? commandData.original.slice(commandData.original.indexOf("--") + 1) : [];
        opts.options = downstreamArgs.concat(additionalArguments);

        return opts;
    }
}

export = CordovaHelper;
