
import resourcesManager = require("./resources-manager");
import ResourcesManager = resourcesManager.ResourcesManager;

import utilHelper = require("./util-helper");
import UtilHelper = utilHelper.UtilHelper;

module TacoUtility {
	export class BuildInfo {
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
        public cordovaVersion: string;
        public buildCommand: string;
        public configuration: string;
        public options: any;
        public buildDir: string;
        public buildLang: string;
        public buildPlatform: string;
        public submissionTime: Date;
        public buildNumber: number;

        public messageId: string;
        public messageArgs: any[];
        public message: string;

        public tgzFilePath: string;
        public appDir: string;
        public appName: string;

        public webDebugProxyPort: number;

        constructor(params: { buildNumber?: number; status?: string; cordovaVersion?: string; buildCommand?: string; configuration?: string; options?: any; buildDir?: string; buildLang?: string; buildPlatform?: string }) {
            this.buildNumber = params.buildNumber;
            this.status = params.status;
            this.cordovaVersion = params.cordovaVersion;
            this.buildCommand = params.buildCommand;
            this.configuration = params.configuration;
            this.options = params.options;
            this.buildDir = params.buildDir;
            this.buildLang = params.buildLang;
            this.buildPlatform = params.buildPlatform;
            this.submissionTime = new Date();
            this.changeList = null;
        }

        public static createNewBuildInfoFromDataObject(buildInfoData: any): BuildInfo {
            var bi: any = new BuildInfo(buildInfoData);
            Object.keys(buildInfoData).forEach(function (k: string): void {
                bi[k] = buildInfoData[k];
            });
            return bi;
        }

        public updateStatus(status: string, messageId?: string, ...messageArgs: any[]): void {
            this.status = status;
            this.messageId = messageId;
            if (arguments.length > 2) {
                this.messageArgs = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            }

            this.statusTime = new Date();
        }

        public localize(req: any): BuildInfo {
            if (this.messageId) {
                this.message = ResourcesManager.getStringForLanguage(req, this.messageId, this.messageArgs);
            } else {
                this.message = ResourcesManager.getStringForLanguage(req, "Build-" + this.status);
            }

            return this;
        }
    }
}

export = TacoUtility;