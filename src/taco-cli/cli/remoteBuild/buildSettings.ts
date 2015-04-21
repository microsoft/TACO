/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/optimist.d.ts" />
"use strict";

import fs = require("fs");
import https = require("https");
import optimist = require("optimist");
import path = require("path");
import Q = require("q");

import ConnectionSecurityHelper = require("./connectionSecurityHelper");
import Settings = require("../utils/settings");
import tacoUtils = require("taco-utils");
import res = tacoUtils.ResourcesManager;

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

        this.platformConfigurationBldDir = path.join(this.projectSourceDir, "remote", this.platform, this.configuration);

        this.cordovaVersion = args.cordovaVersion;

        // Build state and configuration
        this.incrementalBuild = null;

        this.agent = ConnectionSecurityHelper.getAgent(args.buildServerInfo);    }
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
    }
}

export = BuildSettings;