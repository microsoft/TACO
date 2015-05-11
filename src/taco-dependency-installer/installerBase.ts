/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import path = require ("path");

import tacoUtils = require ("taco-utils");

export class InstallerBase {
    protected static MaxDownloadAttempts: number = 1;
    protected static DefaultInstallRootPath: string = path.join(tacoUtils.UtilHelper.tacoHome, "bin");

    protected installerInfo: DependencyInstallerInterfaces.IInstallerData;
    protected softwareVersion: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string) {
        this.installerInfo = installerInfo;
        this.softwareVersion = softwareVersion;
    }

    public run(): Q.Promise<any> {
        return this.downloadInstaller()
            .then(this.install.bind(this));
    }

    protected downloadInstaller(): Q.Promise<any> {
        return Q.resolve({});
    }

    protected install(): Q.Promise<any> {
        return Q.resolve({});
    }
}

/// <enable code="SA1400" />