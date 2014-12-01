/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import resources = require('./resources');
import util = require('./util');

module BuildInfo {

    export var UPLOADING = 'uploading';
    export var UPLOADED = 'uploaded';
    export var EXTRACTED = 'extracted';
    export var INVALID = 'invalid';
    export var BUILDING = 'building';
    export var COMPLETE = 'complete';
    export var EMULATED = 'emulated';
    export var RUNNING = 'running';
    export var INSTALLED = 'installed';
    export var DOWNLOADED = 'downloaded';
    export var DELETED = 'deleted';
    export var ERROR = 'error';

    export class BuildInfo {
        buildNumber: number;
        status: string;
        statusTime: Date;
        cordovaVersion: string;
        buildCommand: string;
        configuration: string;
        options: any;
        buildDir: string;
        submissionTime: Date;
        changeList: {
            deletedFiles: string[];
            changedFiles: string[];
            addedPlugins: string[];
            deletedPlugins: string[];
            deletedFilesIos: string[];
            changedFilesIos: string[];
            addedPluginsIos: string[];
            deletedPluginsIos: string[];
        };

        messageId: string;
        messageArgs: any[];
        message: string

        tgzFilePath: string;
        appDir: string;
        appName: string;

        constructor(buildNumber?: number, status?: string, cordovaVersion?: string, buildCommand?: string, configuration?: string, options?: any, buildDir?: string) {
            this.buildNumber = buildNumber;
            this.status = status;
            this.cordovaVersion = cordovaVersion;
            this.buildCommand = buildCommand;
            this.configuration = configuration;
            this.options = options;
            this.buildDir = buildDir;
            this.submissionTime = new Date();
            this.changeList = null;
        }

        updateStatus(status: string, messageId?: string, ...messageArgs: any[]) {
            this.status = status;
            this.messageId = messageId;
            if (arguments.length > 2) {
                this.messageArgs = util.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            }
            this.statusTime = new Date();
        }

        localize(req: any) : BuildInfo {
            if (this.messageId) {
                this.message = resources.getString(req, this.messageId, this.messageArgs);
            } else {
                this.message = resources.getString(req, 'Build-' + this.status);
            }
            return this;
        }
    }

    export function createNewBuildInfoFromDataObject(buildInfoData: any) {
        var bi = new BuildInfo();
        Object.keys(buildInfoData).forEach(function (k) {
            bi[k] = buildInfoData[k];
        });
        return bi;
    }
}
export = BuildInfo;