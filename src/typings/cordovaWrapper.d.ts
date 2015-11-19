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
         * Static method to invoke a cordova command. Used to invoke the 'platform' or 'plugin' command
         *
         * @param {string} The name of the cordova command to be invoked
         * @param {string} The version of the cordova CLI to use
         * @param {ICordovaCommandParameters} The cordova command parameters
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static invokePlatformPluginCommand(command: string, platformCmdParameters: Cordova.ICordovaCommandParameters, data: Commands.ICommandData, isSilent?: boolean): Q.Promise<any>;

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
