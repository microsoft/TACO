/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import Q = require ("q");

import installerBase = require ("../installerBase");

export class AndroidSdkInstaller extends installerBase.InstallerBase {
    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string) {
        super(installerInfo, softwareVersion);
    }

    protected downloadInstaller(): Q.Promise<any> {
        return Q.resolve({});
    }

    protected install(): Q.Promise<any> {
        return Q.resolve({});
    }
}

/// <enable code="SA1400" />