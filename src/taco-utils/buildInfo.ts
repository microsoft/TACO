// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

import argsHelper = require ("./argsHelper");
import resources = require ("./resourceManager");
import installLogLevel = require ("./installLogLevel");

import ArgsHelper = argsHelper.ArgsHelper;
import InstallLogLevel = installLogLevel.InstallLogLevel;

module TacoUtility {
    export class BuildInfo {
        public static UPLOADING: string = "Uploading";
        public static UPLOADED: string = "Uploaded";
        public static EXTRACTED: string = "Extracted";
        public static INVALID: string = "Invalid";
        public static BUILDING: string = "Building";
        public static COMPLETE: string = "Complete";
        public static EMULATED: string = "Emulated";
        public static RUNNING: string = "Running";
        public static INSTALLED: string = "Installed";
        public static DEBUGGING: string = "Debugging";
        public static DOWNLOADED: string = "Downloaded";
        public static ERROR: string = "Error";

        public status: string;
        /**
         * BuildInfo holds relevant information about a particular build, including its identifier, what kind of build was requested, and the status of the build
         * This information is passed around both within the remote build server, and back to the client
         */
        public changeList: {
            deletedFiles: string[];
            changedFiles: string[];
            addedPlugins: string[];
            deletedPlugins: string[];
            deletedFilesIos: string[];
            changedFilesIos: string[];
            addedPluginsIos: string[];
            deletedPluginsIos: string[];
        };
        public statusTime: Date;
        public buildCommand: string;
        public configuration: string;
        public options: any;
        public buildDir: string;
        public buildLang: string;
        public buildPlatform: string;
        public submissionTime: Date;
        public buildNumber: number;
        public buildSuccessful: boolean;

        public messageId: string;
        public messageArgs: any[];
        public message: string;

        public tgzFilePath: string;
        public appDir: string;
        public logLevel: InstallLogLevel;

        constructor(params: { buildNumber?: number; status?: string; buildCommand?: string; configuration?: string; options?: any; buildDir?: string; buildLang?: string; buildPlatform?: string; logLevel?: string; [index: string]: any }) {
            var self: BuildInfo = this;
            Object.keys(params).forEach(function (key: string): void {
                self[key] = params[key];
            });
            this.buildNumber = params.buildNumber;
            this.status = params.status;
            this.buildCommand = params.buildCommand;
            this.configuration = params.configuration;
            this.options = params.options;
            this.buildDir = params.buildDir;
            this.buildLang = params.buildLang;
            this.buildPlatform = params.buildPlatform;

            switch (params.logLevel) {
                case "silent":
                    this.logLevel = InstallLogLevel.silent;
                    break;
                case "warn":
                    this.logLevel = InstallLogLevel.warn;
                    break;
                case "info":
                    this.logLevel = InstallLogLevel.info;
                    break;
                case "verbose":
                    this.logLevel = InstallLogLevel.verbose;
                    break;
                case "silly":
                    this.logLevel = InstallLogLevel.silly;
                    break;
                case "taco":
                    this.logLevel = InstallLogLevel.taco;
                    break;
                default:
                    this.logLevel = InstallLogLevel.undefined;
            }

            this.submissionTime = new Date();
            this.changeList = null;
            this.buildSuccessful = false;
            this.messageId = null;
            this.messageArgs = null;
            this.message = null;
            this.tgzFilePath = null;
            this.appDir = null;
        }

        [index: string]: any;

        /**
         * Create a new BuildInfo object out of a raw JS object.
         * 
         * @param {Object} buildInfoData An object to convert to a BuildInfo object
         *
         * @returns an instance of BuildInfo with the same keys and values as the input object
         */
        public static createNewBuildInfoFromDataObject(buildInfoData: any): BuildInfo {
            var bi: any = new BuildInfo(buildInfoData);
            Object.keys(buildInfoData).forEach(function (k: string): void {
                bi[k] = buildInfoData[k];
            });
            return bi;
        }

        /**
         * Set the status of the BuildInfo object, along with an optional message
         * 
         * @param {string} status The status to set
         * @param {string} messageId Optional message identifier
         * @param {any[]} messageArgs Optional message arguments
         */
        public updateStatus(status: string, messageId?: string, ...messageArgs: any[]): void {
            this.status = status;
            this.messageId = messageId;
            if (arguments.length > 2) {
                this.messageArgs = ArgsHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            }

            this.statusTime = new Date();
        }

        /**
         * Localize the message of the BuildInfo according to the specified language
         * 
         * @param {string or express.Request} req The request or language to localize for
         * 
         * @returns This object, after setting the message in the appropriate language.
         */
        public localize(req: any, resources: resources.ResourceManager): BuildInfo {
            if (this.messageId) {
                this.message = resources.getStringForLanguage(req, this.messageId, this.messageArgs);
            } else {
                this.message = resources.getStringForLanguage(req, "Build" + this.status);
            }

            return this;
        }
    }
}

export = TacoUtility;
