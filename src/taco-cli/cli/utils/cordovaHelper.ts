/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";

import domain = require("domain");
import path = require ("path");
import Q = require ("q");

import errorHelper = require ("../tacoErrorHelper");
import projectHelper = require ("./projectHelper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import ConfigParser = Cordova.cordova_lib.configparser;
import packageLoader = tacoUtility.TacoPackageLoader;

class CordovaHelper {
    private static CORDOVA_NPM_PACKAGE_NAME: string = "cordova";
    // Cordova's known parameters
    private static CORDOVA_BOOLEAN_PARAMETERS =
    {
        verbose: Boolean,
        version: Boolean,
        help: Boolean,
        silent: Boolean,
        experimental: Boolean,
        noregistry: Boolean,
        shrinkwrap: Boolean,
        usegit: Boolean,
        link: Boolean,
        debug: Boolean,
        release: Boolean,
        device: Boolean,
        emulator: Boolean,
        browserify: Boolean,
        nobuild: Boolean,
        list: Boolean
    };
    private static CORDOVA_VALUE_PARAMETERS =
    {
        "copy-from": String,
        "link-to": path,
        searchpath: String,
        variable: Array,
        archs: String,
        target: String
    };

    /**
     * Prepare the cordovaConfig parameter. This logic is taken directly from cordova and adapted to our CLI.
     */
    public static prepareCordovaConfig(parameters: Cordova.ICordovaCreateParameters): void {
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

        var config: Cordova.ICordovaConfigMetadata = {};

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

            var wwwCfg: Cordova.ICordovaLibMetadata = { url: customWww };

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
    public static toCordovaCliArguments(commandData: commands.ICommandData, platforms: string[] = null): string[] {
        var cordovaArgs: string[] = platforms ? platforms : commandData.remain;
        Object.keys(CordovaHelper.CORDOVA_BOOLEAN_PARAMETERS).forEach(function (key: string): void {
            if (commandData.options[key]) {
                cordovaArgs.push("--" + key);
            }
        });
        Object.keys(CordovaHelper.CORDOVA_VALUE_PARAMETERS).forEach(function (key: string): void {
            if (commandData.options[key]) {
                cordovaArgs.push("--" + key);
                cordovaArgs.push(commandData.options[key]);
            }
        });

        // Append all arguments after and including a lone "--"
        var additionalArguments: string[] = commandData.original.indexOf("--") >= 0 ? commandData.original.slice(commandData.original.indexOf("--")) : [];
        return cordovaArgs.concat(additionalArguments);
    }

    public static toCordovaRunArguments(commandData: commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions {
        // Run, build, emulate, prepare and compile all use the same format at the moment
        return CordovaHelper.toCordovaArgumentsInternal(commandData, platforms);
    }

    public static toCordovaBuildArguments(commandData: commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions {
        // Run, build, emulate, prepare and compile all use the same format at the moment
        return CordovaHelper.toCordovaArgumentsInternal(commandData, platforms);
    }

    public static editConfigXml(projectInfo: projectHelper.IProjectInfo, editFunc: (configParser: ConfigParser) => void): Q.Promise<void> {
        return packageLoader.lazyRequire(CordovaHelper.CORDOVA_NPM_PACKAGE_NAME, CordovaHelper.CORDOVA_NPM_PACKAGE_NAME + "@" + projectInfo.cordovaCliVersion)
            .then(function (cordova: typeof Cordova): Q.Promise<any> {
            var configParser: ConfigParser = new cordova.cordova_lib.configparser(projectInfo.configXmlPath);
            editFunc(configParser);
            configParser.write();
            return Q.resolve({});
        });
    }

    /**
     * Static method to get the plugin version specification from the config.xml file
     *
     * @param {string} The name(id) of the cordova plugin
     * @param {string} The path to config.xml of the project
     * @param {string} The cordova CLI version
     *
     * @return {Q.Promise<string>} A promise with the version specification as a string
     */
    public static getPluginVersionSpec(pluginId: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<string> {
        return packageLoader.lazyRequire(CordovaHelper.CORDOVA_NPM_PACKAGE_NAME, CordovaHelper.CORDOVA_NPM_PACKAGE_NAME + "@" + cordovaCliVersion)
            .then(function (cordova: typeof Cordova): Q.Promise<any> {
            var configParser: ConfigParser = new cordova.cordova_lib.configparser(configXmlPath);
            var pluginEntry: Cordova.ICordovaPlatformPluginInfo = configParser.getPlugin(pluginId);
            var versionSpec: string = pluginEntry ? pluginEntry.spec : "";
            return Q.resolve(versionSpec);
        });
    }

    /**
     * Static method to add the plugin specification to config.xml file
     *
     * @param {ICordovaPlatformPluginInfo } The plugin info
     * @param {string} The path to config.xml of the project
     * @param {string} The cordova CLI version
     *
     * @return {Q.Promise<string>} An empty promise
     */
    public static editPluginVersionSpecs(infoList: Cordova.ICordovaPlatformPluginInfo[], configParser: ConfigParser, addSpec: boolean): void {
        infoList.forEach(function (info: Cordova.ICordovaPlatformPluginInfo ): void {
            configParser.removePlugin(info.name);
            if (addSpec) {
                configParser.addPlugin({ name: info.name, spec: info.spec }, info.pluginVariables);
            }
        });
    }

        /**
         * Static method to get the engine specification from the config.xml file
         *
         * @param {string} The platform name
         * @param {string} The path to config.xml of the project
         * @param {string} The cordova CLI version
         *
         * @return {Q.Promise<string>} A promise with the version specification as a string
         */
    public static getEngineVersionSpec(platform: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<string> {
        return packageLoader.lazyRequire(CordovaHelper.CORDOVA_NPM_PACKAGE_NAME, CordovaHelper.CORDOVA_NPM_PACKAGE_NAME + "@" + cordovaCliVersion)
            .then(function (cordova: typeof Cordova): Q.Promise<any> {
            var configParser: ConfigParser = new cordova.cordova_lib.configparser(configXmlPath);
            var engineSpec: string = "";
            var engines: Cordova.ICordovaPlatformPluginInfo[] = configParser.getEngines();
            engines.forEach(function (engineInfo: Cordova.ICordovaPlatformPluginInfo ): void {
                if (engineInfo.name.toLowerCase() === platform.toLowerCase()) {
                    engineSpec = engineInfo.spec;
                }
            });
            return Q.resolve(engineSpec);
        });
    }

    /**
     * Static method to add the platform specification to config.xml file
     *
     * @param {string} The platform name
     * @param {string} The version specification for the platform
     * @param {string} The path to config.xml of the project
     * @param {string} The cordova CLI version
     *
     * @return {Q.Promise<string>} An empty promise
     */
    public static editEngineVersionSpecs(infoList: Cordova.ICordovaPlatformPluginInfo[], configParser: ConfigParser, addSpec: boolean): void {
        infoList.forEach(function (info: Cordova.ICordovaPlatformPluginInfo ): void {
            configParser.removeEngine(info.name);
            if (addSpec) {
                configParser.addEngine(info.name, info.spec);
            }
        });
    }

    /**
     * Return a dictionary where the keys are supported platforms, or "null" if the answer is unknown.
     * For sufficiently recent kit projects, we can get an accurate answer via cordova.cordova_lib.cordova_platforms, while 
     * for older versions of cordova or for non-kit projects, we default back to being permissive
     */
    public static getSupportedPlatforms(): Q.Promise<CordovaHelper.IDictionary<any>> {
        return CordovaHelper.tryInvokeCordova<CordovaHelper.IDictionary<any>>((cordova: typeof Cordova): CordovaHelper.IDictionary<any> => {
            if (!cordova.cordova_lib) {
                // Older versions of cordova do not have a cordova_lib, so fall back to being permissive
                return null;
            } else {
                return cordova.cordova_lib.cordova_platforms;
            }
        }, (): CordovaHelper.IDictionary<any> => null);
    }

    /**
     * Given two functions, one which operates on a Cordova object and one which does not, this function will attempt to
     * get access to an appropriate Cordova object and invoke the first function. If we do not know which Cordova to use, then it
     * calls the second function instead.
     */
    public static tryInvokeCordova<T>(cordovaFunction: (cordova: Cordova.ICordova) => T | Q.Promise<T>, otherFunction: () => T | Q.Promise<T>,
        options: { logLevel?: tacoUtility.InstallLogLevel, isSilent?: boolean } = {}): Q.Promise<T> {
        return projectHelper.getProjectInfo().then(function (projectInfo: projectHelper.IProjectInfo): T | Q.Promise<T> {
            if (projectInfo.cordovaCliVersion) {
                return CordovaHelper.wrapCordovaInvocation<T>(projectInfo.cordovaCliVersion, cordovaFunction, options.logLevel || tacoUtility.InstallLogLevel.taco, options.isSilent);
            } else {
                return otherFunction();
            }
        });
    }

    /**
     * Acquire the specified version of Cordova, and then invoke the given function with that Cordova as an argument.
     * The function invocation is wrapped in a domain, so any uncaught errors can be encapsulated, and the Cordova object
     * has listeners added to print any messages to the output.
     */
    public static wrapCordovaInvocation<T>(cliVersion: string, func: (cordova: Cordova.ICordova) => T | Q.Promise<T>, logVerbosity: tacoUtility.InstallLogLevel = tacoUtility.InstallLogLevel.warn, silent: boolean = false): Q.Promise<T> {
        return packageLoader.lazyRequire(CordovaHelper.CORDOVA_NPM_PACKAGE_NAME, CordovaHelper.CORDOVA_NPM_PACKAGE_NAME + "@" + cliVersion, logVerbosity)
            .then(function (cordova: typeof Cordova): Q.Promise<any> {
                if (!silent) {
                    cordova.on("results", console.info);
                    cordova.on("warn", console.warn);
                    cordova.on("error", console.error);
                    cordova.on("log", console.log);
                }

                var dom = domain.create();
                var deferred = Q.defer<T>();

                dom.on("error", function (err: any): void {
                    deferred.reject(errorHelper.wrap(TacoErrorCodes.CordovaCommandUnhandledException, err));
                    // Note: At this point the state can be arbitrarily bad, so we really shouldn't try to recover much from here
                });

                dom.run(function (): void {
                    Q(func(cordova)).done((result: T) => deferred.resolve(result), (err: any) => deferred.reject(err));
                });

                return deferred.promise.finally(() => {
                    if (!silent) {
                        cordova.off("results", console.info);
                        cordova.off("warn", console.warn);
                        cordova.off("error", console.error);
                        cordova.off("log", console.log);
                    }
                });
            });
    }

    /**
     * Construct the options for programatically calling emulate, build, prepare, compile, or run via cordova.raw.X
     */
    private static toCordovaArgumentsInternal(commandData: commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions {
        var opts: Cordova.ICordovaRawOptions = {
            platforms: platforms ? platforms : commandData.remain,
            options: [],
            verbose: commandData.options["verbose"] || false,
            silent: commandData.options["silent"] || false,
            browserify: commandData.options["browserify"] || false
        };

        // Reconstruct the args to be passed along to platform scripts.
        // This is an ugly temporary fix. The code spawning or otherwise
        // calling into platform code should be dealing with this based
        // on the parsed args object.
        var downstreamArgs: string[] = [];
        var argNames = ["debug", "release", "device", "emulator", "nobuild", "list"];
        argNames.forEach(function (flag: string): void {
            if (commandData.options[flag]) {
                downstreamArgs.push("--" + flag);
            }
        });

        if (commandData.options["target"]) {
            downstreamArgs.push("--target=" + commandData.options["target"]);
        }

        if (commandData.options["archs"]) {
            downstreamArgs.push("--archs=" + commandData.options["archs"]);
        }

	// ToDO:  what if devicesync? commandData.options["devicesync"]
	// what if user typed: taco run ios --livereload -- --justlaunch ? => cordova run ios -- --livereload --justlaunch
	// what if user typed: taco run ios --livereload ? => cordova run ios -- --livereload
	// what if user typed: taco run ios -- ?
	// ToDO: After processing its args, the livereload plugin should delete the --livereload options (livereload, ignore, tunnel) ?
	if (commandData.options["livereload"]) {
	    var livereloadIndex: number = commandData.original.indexOf("--livereload");
	    var doubleDashIndex: number = commandData.original.indexOf("--");
	    if (doubleDashIndex >= 0) {
	        commandData.original.splice(doubleDashIndex + 1, 0, "--livereload");
	    } else {
	        commandData.original.splice(livereloadIndex, 0, "--");
	    }
	}

        // Include all arguments after, but not including, a lone "--"
        var additionalArguments: string[] = commandData.original.indexOf("--") >= 0 ? commandData.original.slice(commandData.original.indexOf("--") + 1) : [];
        opts.options = downstreamArgs.concat(additionalArguments);

        return opts;
    }
}

module CordovaHelper {
    export interface IDictionary<T> {
        [key: string]: T;
    }
}

export = CordovaHelper;
