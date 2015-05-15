/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import os = require ("os");
import Q = require ("q");

import InstallerBase = require ("./installerBase");
import resources = require ("../resources/resourceManager");

class IosSimInstaller extends InstallerBase {
    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string) {
        super(installerInfo, softwareVersion, installTo);
    }

    protected downloadWin32(): Q.Promise<any> {
        // This dependency is only useful on Mac OS
        return Q.reject(resources.getString("UnsupportedPlatform", os.platform()));
    }

    protected installWin32(): Q.Promise<any> {
        // This dependency is only useful on Mac OS
        return Q.reject(resources.getString("UnsupportedPlatform", os.platform()));
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        // This dependency is only useful on Mac OS
        return Q.reject(resources.getString("UnsupportedPlatform", os.platform()));
    }
}

export = IosSimInstaller;

/// <enable code="SA1400" />