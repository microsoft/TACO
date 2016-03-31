// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/Q.d.ts" />

"use strict";

import childProcess = require ("child_process");
import Q = require ("q");

import InstallerBase = require ("./installerBase");
import installerProtocol = require ("../elevatedInstallerProtocol");
import installerUtils = require ("../utils/installerUtils");

import ILogger = installerProtocol.ILogger;

class IosDeployInstaller extends InstallerBase {
    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration) {
        super(installerInfo, softwareVersion, installTo, logger, steps, "ios-deploy");
    }

    protected installWin32(): Q.Promise<any> {
        return this.installDefault();
    }

    protected installDarwin(): Q.Promise<any> {
        return this.installDefault();
    }

    private installDefault(): Q.Promise<any> {
        return installerUtils.installNpmPackage(this.installerInfo.installSource);
    }
}

export = IosDeployInstaller;
