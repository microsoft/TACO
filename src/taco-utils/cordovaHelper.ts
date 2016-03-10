// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

"use strict";

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/dictionary.d.ts" />
/// <reference path="../typings/tacoProjectInfo.d.ts" />

import domain = require("domain");
import os = require("os");
import path = require("path");
import Q = require("q");
import semver = require("semver");

import commands = require("./commands");
import errorHelper = require("./tacoErrorHelper");
import installLogLevel = require("./installLogLevel");
import projectHelper = require("./projectHelper");
import resources = require("./resources/resourceManager");
import tacoErrorCodes = require("./tacoErrorCodes");
import tacoPackageLoader = require("./tacoPackageLoader");

import Commands = commands.Commands;
import ConfigParser = Cordova.cordova_lib.configparser;
import ProjectHelper = projectHelper.ProjectHelper;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import TacoPackageLoader = tacoPackageLoader.TacoPackageLoader;
import InstallLogLevel = installLogLevel.InstallLogLevel;

module TacoUtility {
    export class CordovaHelper {
        // Cordova's known parameters
        private static CORDOVA_BOOLEAN_PARAMETERS: any =
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
        private static CORDOVA_VALUE_PARAMETERS: any =
        {
            "copy-from": String,
            "link-to": path,
            searchpath: String,
            variable: Array,
            archs: String,
            target: String
        };
        private static RAW_API_540_VERSION: string = "5.4.0";

        private static globalCordovaCommandName: string = os.platform() === "win32" ? "cordova.cmd" : "cordova";

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
            var customWww: string = parameters.copyFrom || parameters.linkTo;

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
        public static toCordovaCliArguments(commandData: Commands.ICommandData, platforms: string[] = null): string[] {
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

        public static toCordovaRunArguments(cordovaVersion: string, commandData: Commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions | Cordova.ICordova540RawOptions {
            // Run, build, emulate, prepare and compile all use the same format at the moment
            return CordovaHelper.toCordovaArgumentsInternal(cordovaVersion, commandData, platforms);
        }

        public static toCordovaBuildArguments(cordovaVersion: string, commandData: Commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions | Cordova.ICordova540RawOptions {
            // Run, build, emulate, prepare and compile all use the same format at the moment
            return CordovaHelper.toCordovaArgumentsInternal(cordovaVersion, commandData, platforms);
        }

        public static toCordovaTargetsArguments(cordovaVersion: string, commandData: Commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions | Cordova.ICordova540RawOptions {
            // Run, build, emulate, prepare and compile all use the same format at the moment
            return CordovaHelper.toCordovaArgumentsInternal(cordovaVersion, commandData, platforms);
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
        public static getPluginVersionSpec(pluginId: string, projectInfo: IProjectInfo): Q.Promise<string> {
            return CordovaHelper.getTargetVersionSpec(projectInfo, configParser => {
                var pluginEntry: Cordova.ICordovaPluginInfo = configParser.getPlugin(pluginId);
                return pluginEntry ? pluginEntry.spec : "";
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
        public static editPluginVersionSpecs(targetSpecs: Cordova.ICordovaPluginInfo[], projectInfo: IProjectInfo, addSpec: boolean): Q.Promise<any> {
            return CordovaHelper.editConfigXml(projectInfo, function (configParser: Cordova.cordova_lib.configparser): void {
                targetSpecs.forEach(function (targetSpec: Cordova.ICordovaPluginInfo): void {
                    configParser.removePlugin(targetSpec.name);
                    if (addSpec) {
                        configParser.addPlugin({ name: targetSpec.name, spec: targetSpec.spec }, targetSpec.pluginVariables);
                    }
                });
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
        public static getEngineVersionSpec(platformName: string, projectInfo: IProjectInfo): Q.Promise<string> {
            return CordovaHelper.getTargetVersionSpec(projectInfo, configParser => {
                configParser.getEngines().forEach(function (engineInfo: Cordova.ICordovaPlatformInfo): string {
                    if (engineInfo.name.toLowerCase() === platformName.toLowerCase()) {
                        return engineInfo.spec;
                    }
                });
                return "";
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
        public static editEngineVersionSpecs(targetSpecs: Cordova.ICordovaPlatformInfo[], projectInfo: IProjectInfo, addSpec: boolean): Q.Promise<any> {
            return CordovaHelper.editConfigXml(projectInfo, function (configParser: Cordova.cordova_lib.configparser): void {
                targetSpecs.forEach(function (targetSpec: Cordova.ICordovaPlatformInfo): void {
                    configParser.removeEngine(targetSpec.name);
                    if (addSpec) {
                        configParser.addEngine(targetSpec.name, targetSpec.spec);
                    }
                });
            });
        }

        /**
         * Return a dictionary where the keys are supported platforms, or "null" if the answer is unknown.
         * For sufficiently recent kit projects, we can get an accurate answer via cordova.cordova_lib.cordova_platforms, while 
         * for older versions of cordova or for non-kit projects, we default back to being permissive
         */
        public static getSupportedPlatforms(): Q.Promise<IDictionary<any>> {
            return CordovaHelper.tryInvokeCordova<IDictionary<any>>((cordova: typeof Cordova): IDictionary<any> => {
                if (!cordova.cordova_lib) {
                    // Older versions of cordova do not have a cordova_lib, so fall back to being permissive
                    return null;
                } else {
                    return cordova.cordova_lib.cordova_platforms;
                }
            }, (): IDictionary<any> => null);
        }

        /**
         * Given two functions, one which operates on a Cordova object and one which does not, this function will attempt to
         * get access to an appropriate Cordova object and invoke the first function. If we do not know which Cordova to use, then it
         * calls the second function instead.
         */
        public static tryInvokeCordova<T>(cordovaFunction: (cordova: Cordova.ICordova) => T | Q.Promise<T>, otherFunction: () => T | Q.Promise<T>,
            options: { logLevel?: InstallLogLevel, isSilent?: boolean } = {}): Q.Promise<T> {
            return ProjectHelper.getProjectInfo().then(function (projectInfo: IProjectInfo): T | Q.Promise<T> {
                if (projectInfo.cordovaCliVersion) {
                    return CordovaHelper.wrapCordovaInvocation<T>(projectInfo.cordovaCliVersion, cordovaFunction, options.logLevel || InstallLogLevel.taco, options.isSilent);
                } else {
                    return otherFunction();
                }
            });
        }

        public static ensureCordovaVersionAcceptable(cliVersion: string): void {
            if (semver.valid(cliVersion) && semver.lt(cliVersion, "5.4.0") && semver.gte(process.versions.node, "5.0.0")) {
                throw errorHelper.get(TacoErrorCodes.InvalidCordovaWithNode5);
            }
        }

        /**
         * Acquire the specified version of Cordova, and then invoke the given function with that Cordova as an argument.
         * The function invocation is wrapped in a domain, so any uncaught errors can be encapsulated, and the Cordova object
         * has listeners added to print any messages to the output.
         */
        public static wrapCordovaInvocation<T>(cliVersion: string, func: (cordova: Cordova.ICordova) => T | Q.Promise<T>, logVerbosity: InstallLogLevel = InstallLogLevel.warn, silent: boolean = false): Q.Promise<T> {
            CordovaHelper.ensureCordovaVersionAcceptable(cliVersion);
            return TacoPackageLoader.lazyCordovaRequire(cliVersion, logVerbosity)
                .then(function (cordova: typeof Cordova): Q.Promise<any> {
                    if (!silent) {
                        cordova.on("results", console.info);
                        cordova.on("warn", console.warn);
                        cordova.on("error", console.error);
                        cordova.on("log", console.log);
                    }

                    var dom: domain.Domain = domain.create();
                    var deferred: Q.Deferred<T> = Q.defer<T>();

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

        public static getCordovaExecutable(): Q.Promise<string> {
            return ProjectHelper.getProjectInfo()
                .then(function (projectInfo: IProjectInfo): string | Q.Promise<string> {
                    if (projectInfo.cordovaCliVersion) {
                        return TacoPackageLoader.lazyCordovaRun(projectInfo.cordovaCliVersion);
                    } else {
                        return CordovaHelper.globalCordovaCommandName;
                    }
                })
                .catch(function (err: string): string {
                    return CordovaHelper.globalCordovaCommandName;
                });
        }

        /**
         * Construct the options for programatically calling emulate, build, prepare, compile, or run via cordova.raw.X
         */
        private static toCordovaArgumentsInternal(cordovaVersion: string, commandData: Commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions | Cordova.ICordova540RawOptions {
            if (semver.gte(cordovaVersion, CordovaHelper.RAW_API_540_VERSION)) {
                return CordovaHelper.toCordovaRaw540Arguments(commandData, platforms);
            }

            return CordovaHelper.toCordovaRawArguments(commandData, platforms);
        }

        /**
         * Construct the options for programatically calling emulate, build, prepare, compile, or run via cordova.raw.X, for the raw API of Cordova < 5.4.0
         */
        private static toCordovaRawArguments(commandData: Commands.ICommandData, platforms: string[] = null): Cordova.ICordovaRawOptions {
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
            var argNames: string[] = ["debug", "release", "device", "emulator", "nobuild", "list"];
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

            // Include all arguments after, but not including, a lone "--"
            var additionalArguments: string[] = commandData.original.indexOf("--") >= 0 ? commandData.original.slice(commandData.original.indexOf("--") + 1) : [];
            opts.options = downstreamArgs.concat(additionalArguments);

            return opts;
        }

        /**
         * Construct the options for programatically calling emulate, build, prepare, compile, or run via cordova.raw.X, for the raw API of Cordova >= 5.4.0
         */
        private static toCordovaRaw540Arguments(commandData: Commands.ICommandData, platforms: string[] = null): Cordova.ICordova540RawOptions {
            var buildOpts: Cordova.ICordova540BuildOptions = {
                archs: commandData.options["archs"] || null,
                argv: commandData.original.indexOf("--") >= 0 ? commandData.original.slice(commandData.original.indexOf("--") + 1) : [],
                buildconfig: commandData.options["buildconfig"] || null,
                debug: commandData.options["debug"] || false,
                device: commandData.options["device"] || false,
                emulator: commandData.options["emulator"] || false,
                nobuild: commandData.options["nobuild"] || false,
                release: commandData.options["release"] || false,
                target: commandData.options["target"] || null,
            };
            var cordovaArgs: Cordova.ICordova540RawOptions = {
                platforms: platforms ? platforms : commandData.remain,
                options: buildOpts,
                verbose: commandData.options["verbose"] || false,
                silent: commandData.options["silent"] || false,
                browserify: commandData.options["browserify"] || false
            };

            return cordovaArgs;
        }

        private static editConfigXml(projectInfo: IProjectInfo, editFunc: (configParser: ConfigParser) => void): Q.Promise<void> {
            return TacoPackageLoader.lazyCordovaRequire(projectInfo.cordovaCliVersion)
                .then(function (cordova: typeof Cordova): void {
                    var configParser: ConfigParser = new cordova.cordova_lib.configparser(projectInfo.configXmlPath);
                    editFunc(configParser);
                    configParser.write();
                });
        }

        private static getTargetVersionSpec(projectInfo: IProjectInfo, readFunc: (configParser: ConfigParser) => string): Q.Promise<string> {
            return TacoPackageLoader.lazyCordovaRequire(projectInfo.cordovaCliVersion)
                .then(function (cordova: typeof Cordova): string {
                    var configParser: ConfigParser = new cordova.cordova_lib.configparser(projectInfo.configXmlPath);
                    return readFunc(configParser);
                });
        }
    }
}

export = TacoUtility;
