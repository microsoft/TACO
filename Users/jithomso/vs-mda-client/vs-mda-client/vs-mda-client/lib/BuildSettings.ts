/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import path = require('path');
import https = require('https');
import res = require('./resources');
import fs = require('fs');
import optimist = require('optimist');
import ConnectionSecurity = require('./ConnectionSecurity');

var vsToCordovaPlatformMappings = {
    'Android': 'android',
    'iOS': 'ios',
    'Windows': 'windows',
    'Windows-AnyCPU': 'windows',
    'Windows-x64': 'windows',
    'Windows-x86': 'windows',
    'Windows-ARM': 'windows',
    'Windows Phone': 'wp8',
    'Windows Phone 8': 'wp8',
    'Windows Phone (Universal)': 'windows'
};

var vsToCordovaConfigurationMappings = {
    'Distribution': 'Release'
};

class BuildSettings {
    constructor(workingDirectory: string) {
        // Command line settings
        var argv: any = optimist(process.argv.slice(2)).argv;
        this.buildCommand = argv._.length > 0 ? argv._[0] : null;
        this.platform = argv.platform;
        this.configuration = argv.configuration;
        this.projectName = argv.projectName;
        this.projectSourceDir = path.resolve(workingDirectory, argv.projectDir);
        this.buildServerUrl = argv.buildServerUrl;
        this.buildTarget = argv.buildTarget;
        this.language = argv.language;
        this.changeListJsonFile = argv.changeListJsonFile;

        // Configure resources so we can report errors correctly
        res.init(this.language);

        // Derived convenience settings:
        this.cordovaPlatform = vsToCordovaPlatformMappings[this.platform] || null;
        this.cordovaConfiguration = vsToCordovaConfigurationMappings[this.configuration] || this.configuration;
        this.binDir = path.join(this.projectSourceDir, 'bin');
        this.bldDir = path.join(this.projectSourceDir, 'bld');
        this.cordovaAppDir = path.join(this.bldDir, this.configuration);
        this.platformConfigurationBldDir = path.join(this.bldDir, this.platform, this.configuration);
        this.platformConfigurationBinDir = path.join(this.binDir, this.platform, this.configuration);


        // Environment settings:
        this.cordovaVersion = require('cordova/package.json').version;

        // Build state and configuration
        this.requireRunPreparePlatform = true;
        this.isIncrementalBuild = false;

        // Incremental change list
        this.changeListFile = path.join(this.platformConfigurationBldDir, 'changeList.json');
        if (fs.existsSync(this.changeListFile)) {
            this.changeList = JSON.parse(fs.readFileSync(this.changeListFile, { encoding: 'utf-8' }));
        }

        // Javascript file list - add them to the changedFiles and changedFilesIos lists
        this.jsFileListPath = path.join(this.platformConfigurationBldDir, 'jsFileList.json');
        if (this.platform === 'iOS' && fs.existsSync(this.jsFileListPath)) {
            var jsFileList = JSON.parse(fs.readFileSync(this.jsFileListPath, { encoding: 'utf-8' }));

            for (var i = 0; i < jsFileList.jsFileList.length; i++) {
                this.changeList.changedFiles.push(jsFileList.jsFileList[i]);
                this.changeList.changedFilesIos.push(jsFileList.jsFileList[i]);
            }
        }

        this.agent = ConnectionSecurity.getAgent(argv);

    }

    buildCommand: string;
    platform: string;
    configuration: string;
    projectName: string;
    projectSourceDir: string;
    buildServerUrl: string;
    buildTarget: string;
    language: string;
    changeListJsonFile: string;
    certFile: string;

    cordovaPlatform: string;
    cordovaConfiguration: string;
    binDir: string;
    bldDir: string;
    cordovaAppDir: string;
    platformConfigurationBldDir: string;
    platformConfigurationBinDir: string;

    cordovaVersion: string;

    requireRunPreparePlatform: boolean;
    isIncrementalBuild: boolean;

    changeListFile: string;
    changeList: {
        addedPlugins: string[];
        changedFiles: string[];
        changedFilesIos: string[];
    };
    jsFileListPath: string;

    agent:  () => https.Agent;
}

export = BuildSettings;