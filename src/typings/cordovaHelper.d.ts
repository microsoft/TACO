/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/commands.d.ts" />
/// <reference path="../typings/cordovaExtensions.d.ts" />
/// <reference path="../typings/installLogLevel.d.ts" />
/// <reference path="../typings/tacoProjectInfo.d.ts" />
/// <reference path="../typings/dictionary.d.ts" />

declare module TacoUtility {
    class CordovaHelper {
        /**
         * Prepare the cordovaConfig parameter. This logic is taken directly from cordova and adapted to our CLI.
         */
        public static prepareCordovaConfig(parameters: Cordova.ICordovaCreateParameters): void;
        public static toCordovaCliArguments(commandData: Commands.ICommandData, platforms: string[]): string[];
        public static toCordovaRunArguments(commandData: Commands.ICommandData, platforms: string[]): Cordova.ICordovaRawOptions;
        public static toCordovaBuildArguments(commandData: Commands.ICommandData, platforms: string[]): Cordova.ICordovaRawOptions;

        public static toCordovaTargetsArguments(commandData: Commands.ICommandData, platforms: string[]): Cordova.ICordovaRawOptions;


        public static editConfigXml(projectInfo: IProjectInfo, editFunc: (configParser: Cordova.cordova_lib.configparser) => void): Q.Promise<void>;


        /**
         * Static method to get the plugin version specification from the config.xml file
         *
         * @param {string} The name(id) of the cordova plugin
         * @param {string} The path to config.xml of the project
         * @param {string} The cordova CLI version
         *
         * @return {Q.Promise<string>} A promise with the version specification as a string
         */
        public static getPluginVersionSpec(pluginId: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<string>;

        /**
         * Static method to add the plugin specification to config.xml file
         *
         * @param {ICordovaPlatformPluginInfo } The plugin info
         * @param {string} The path to config.xml of the project
         * @param {string} The cordova CLI version
         *
         * @return {Q.Promise<string>} An empty promise
         */
        public static editPluginVersionSpecs(infoList: Cordova.ICordovaPlatformPluginInfo[], configParser: Cordova.cordova_lib.configparser, addSpec: boolean): void;

        /**
         * Static method to get the engine specification from the config.xml file
         *
         * @param {string} The platform name
         * @param {string} The path to config.xml of the project
         * @param {string} The cordova CLI version
         *
         * @return {Q.Promise<string>} A promise with the version specification as a string
         */
        public static getEngineVersionSpec(platform: string, configXmlPath: string, cordovaCliVersion: string): Q.Promise<string>;

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
        public static editEngineVersionSpecs(infoList: Cordova.ICordovaPlatformPluginInfo[], configParser: Cordova.cordova_lib.configparser, addSpec: boolean): void;

        /**
         * Return a dictionary where the keys are supported platforms, or "null" if the answer is unknown.
         * For sufficiently recent kit projects, we can get an accurate answer via cordova.cordova_lib.cordova_platforms, while 
         * for older versions of cordova or for non-kit projects, we default back to being permissive
         */
        public static getSupportedPlatforms(): Q.Promise<IDictionary<any>>;

        /**
         * Given two functions, one which operates on a Cordova object and one which does not, this function will attempt to
         * get access to an appropriate Cordova object and invoke the first function. If we do not know which Cordova to use, then it
         * calls the second function instead.
         */
        public static tryInvokeCordova<T>(cordovaFunction: (cordova: Cordova.ICordova) => T | Q.Promise<T>, otherFunction: () => T | Q.Promise<T>,
            options: { logLevel?: InstallLogLevel, isSilent?: boolean }): Q.Promise<T>;

        public static ensureCordovaVersionAcceptable(cliVersion: string): void;

        /**
         * Acquire the specified version of Cordova, and then invoke the given function with that Cordova as an argument.
         * The function invocation is wrapped in a domain, so any uncaught errors can be encapsulated, and the Cordova object
         * has listeners added to print any messages to the output.
         */
        public static wrapCordovaInvocation<T>(cliVersion: string, func: (cordova: Cordova.ICordova) => T | Q.Promise<T>, logVerbosity: InstallLogLevel, silent: boolean): Q.Promise<T>;

        public static getCordovaExecutable(): Q.Promise<string>;

    }
}
