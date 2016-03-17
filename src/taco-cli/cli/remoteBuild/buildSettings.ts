// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
"use strict";

import fs = require ("fs");
import https = require ("https");
import path = require ("path");
import Q = require ("q");

import ConnectionSecurityHelper = require ("./connectionSecurityHelper");
import Settings = require ("../utils/settings");
import tacoUtils = require ("taco-utils");

class BuildSettings {
    public agent: Q.Promise<https.Agent>;
    public platform: string;
    public configuration: string;
    public projectSourceDir: string;
    public buildServerUrl: string;
    public buildTarget: string;
    public language: string;
    public changeListJsonFile: string;
    public certFile: string;
    public options: string[];

    public buildCommand: string;
    public platformConfigurationBldDir: string;

    public cordovaVersion: string;

    public incrementalBuild: number;

    constructor(args: BuildSettings.IBuildSettingArgs) {
        this.buildCommand = args.buildCommand;
        this.platform = args.platform;
        this.configuration = args.configuration;
        this.projectSourceDir = path.resolve(args.projectSourceDir);
        this.buildServerUrl = Settings.getRemoteServerUrl(args.buildServerInfo);
        this.buildTarget = args.buildTarget;
        this.language = args.language;
        this.changeListJsonFile = args.changeListJsonFile;
        this.options = args.options;

        this.platformConfigurationBldDir = path.join(this.projectSourceDir, "remote", this.platform, this.configuration);

        this.cordovaVersion = args.cordovaVersion;

        // Build state and configuration
        this.incrementalBuild = null;

        this.agent = ConnectionSecurityHelper.getAgent(args.buildServerInfo);
    }

    public get buildInfoFilePath(): string {
        return path.join(this.platformConfigurationBldDir, "buildInfo.json");
    }
}

module BuildSettings {
    export interface IBuildSettingArgs {
        buildCommand: string;
        platform: string;
        configuration: string;
        projectSourceDir: string;
        buildServerInfo: Settings.IRemoteConnectionInfo;
        language: string;
        cordovaVersion: string;
        buildTarget?: string;
        changeListJsonFile?: string;
        options?: string[];
    }
}

export = BuildSettings;
