
import utils = require ("./resourceManager");
import utilHelper = require ("./utilHelper");

import UtilHelper = utilHelper.UtilHelper;

module TacoUtility {
    export class BuildInfo {
        public static UPLOADING = "uploading";
        public static UPLOADED = "uploaded";
        public static EXTRACTED = "extracted";
        public static INVALID = "invalid";
        public static BUILDING = "building";
        public static COMPLETE = "complete";
        public static EMULATED = "emulated";
        public static RUNNING = "running";
        public static INSTALLED = "installed";
        public static DEBUGGING = "debugging";
        public static DOWNLOADED = "downloaded";
        public static ERROR = "error";

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
        public logLevel: string;

        constructor(params: { buildNumber?: number; status?: string; buildCommand?: string; configuration?: string; options?: any; buildDir?: string; buildLang?: string; buildPlatform?: string; logLevel?: string; [index: string]: any }) {
            var self = this;
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
            this.logLevel = params.logLevel;

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
                this.messageArgs = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
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
        public localize(resources: utils.ResourceManager): BuildInfo {
            if (this.messageId) {
                this.message = resources.getString(this.messageId, this.messageArgs);
            } else {
                this.message = resources.getString("Build-" + this.status);
            }

            return this;
        }
    }
}

export = TacoUtility;