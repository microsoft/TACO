/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />
"use strict"

import path = require ("path");
import tacoUtils = require ("taco-utils");

export class InstallerBase {
    protected static MaxDownloadAttempts: number = 1;
    protected InstallerInfo: DependencyInstallerInterfaces.IInstallerInfo;
    protected SoftwareVersion: string;
    protected LicenseUrl: string;

    public constructor(installerInfo: DependencyInstallerInterfaces.IInstallerInfo, softwareVersion: string, licenseUrl: string) {
        this.InstallerInfo = installerInfo;
        this.SoftwareVersion = softwareVersion;
        this.LicenseUrl = licenseUrl;
    }

    public run(version: string): Q.Promise<any> {
        var self = this;

        return this.downloadInstaller()
            .then(self.install);
    }

    public getLicenseUrl(): string {
        return this.LicenseUrl;
    }

    public getSoftwareVersion(): string {
        return this.SoftwareVersion;
    }

    protected downloadInstaller(): Q.Promise<any> {
        throw new Error("Abstract method was called");
    }

    protected install(): Q.Promise<any> {
        throw new Error("Abstract method was called");
    }

    protected static defaultInstallRootPath(): string {
        return path.join(tacoUtils.UtilHelper.tacoHome, "bin");
    }
}