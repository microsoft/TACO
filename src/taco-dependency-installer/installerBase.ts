/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/dependenciesInstaller.d.ts" />
/// <reference path="../typings/taco-utils.d.ts" />

import path = require ("path");
import dependenciesInstaller = require ("dependencies-installer");
import tacoUtils = require ("taco-utils");

class InstallerBase {
    protected static MaxDownloadAttempts: number = 1;
    protected InstallerInfo: dependenciesInstaller.IInstallerInfo;
    protected SoftwareVersion: string;
    protected LicenseUrl: string;

    public constructor(installerInfo: dependenciesInstaller.IInstallerInfo, softwareVersion: string, licenseUrl: string) {
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

    private downloadInstaller(): Q.Promise<any> {
        throw new Error("Abstract method was called");
    }

    private install(): Q.Promise<any> {
        throw new Error("Abstract method was called");
    }

    protected static defaultInstallRootPath(): string {
        return path.join(tacoUtils.UtilHelper.tacoHome, "bin");
    }
}