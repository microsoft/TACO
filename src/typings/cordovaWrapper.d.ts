/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/commands.d.ts" />
/// <reference path="../typings/cordovaExtensions.d.ts" />
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />

declare module TacoUtility {
    class CordovaWrapper {
        public static cli(args: string[], captureOutput?: boolean): Q.Promise<any>;

        public static build(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any>;

        /**
         * Static method to invoke cordova platform command
         *
         * @param {string} The name of the platform sub-command to be invoked
         * @param {ICommandData} wrapping commandData object
         * @param {string} list of platforms to add/remove
         * @param {ICordovaPlatformOptions} platform options if any
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static platform(subCommand: string, commandData: Commands.ICommandData, platforms?: string[], options?: Cordova.ICordovaPlatformOptions, isSilent?: boolean): Q.Promise<any>;

        /**
         * Static method to invoke cordova plugin command
         *
         * @param {string} The name of the plugin sub-command to be invoked
         * @param {string} list of plugins to add/remove
         * @param {ICordovaPluginOptions} plugin options if any
         * @param {ICommandData} wrapping commandData object
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static plugin(subCommand: string, commandData: Commands.ICommandData, plugins?: string[], options?: Cordova.ICordovaPluginOptions, isSilent?: boolean): Q.Promise<any>;

        public static emulate(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any>;

        public static requirements(platforms: string[]): Q.Promise<any>;

        /**
         * Wrapper for 'cordova create' command.
         *
         * @param {string} The version of the cordova CLI to use
         * @param {ICordovaCreateParameters} The cordova create options
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static create(cordovaCliVersion: string, cordovaParameters: Cordova.ICordovaCreateParameters): Q.Promise<any>;

        public static getGlobalCordovaVersion(): Q.Promise<string>;

        public static getCordovaVersion(): Q.Promise<string>;

        public static run(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any>;

        public static targets(commandData: Commands.ICommandData, platforms?: string[]): Q.Promise<any>;
    }
}
