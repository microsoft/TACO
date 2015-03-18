/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/taco-utils.d.ts" />
/// <reference path="../../../typings/optimist.d.ts" />
"use strict";

import path = require ("path");
import https = require ("https");
import tacoUtils = require ("taco-utils");
import res = tacoUtils.ResourcesManager;
import fs = require ("fs");
import optimist = require ("optimist");
import Q = require ("q");
import ConnectionSecurity = require ("./connection-security");
import Settings = require ("../utils/settings");

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

        // TODO: accept version in arguments
        this.cordovaVersion = require("cordova/package.json").version;

        // Build state and configuration
        this.incrementalBuild = null;

        this.agent = ConnectionSecurity.getAgent(args.buildServerInfo);
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
        buildTarget?: string;
        changeListJsonFile?: string;
    }
}

export = BuildSettings;