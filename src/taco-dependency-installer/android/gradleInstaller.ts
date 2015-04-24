/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
"use strict"

import Q = require ("q");
import installerBase = require ("../installerBase");

export class GradleInstaller extends installerBase.InstallerBase {
    public constructor(installerInfo: DependencyInstallerInterfaces.IInstallerInfo, softwareVersion: string, licenseUrl: string) {
        super(installerInfo, softwareVersion, licenseUrl);
    }

    protected downloadInstaller(): Q.Promise<any> {
        return Q.resolve({});
    }

    protected install(): Q.Promise<any> {
        return Q.resolve({});
    }
}