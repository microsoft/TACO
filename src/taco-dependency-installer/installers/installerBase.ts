/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import wrench = require ("wrench");

import installerProtocol = require ("../elevatedInstallerProtocol");
import installerUtils = require ("../utils/installerUtils");
import resources = require ("../resources/resourceManager");
import tacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import ILogger = installerProtocol.ILogger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;

class InstallerBase {
    private id: string;

    protected static InstallerCache: string = path.join(tacoUtils.UtilHelper.tacoHome, "third-party-installers");

    protected installerInfo: DependencyInstallerInterfaces.IInstallerData;
    protected steps: DependencyInstallerInterfaces.IStepsDeclaration;
    protected softwareVersion: string;
    protected installDestination: string;
    protected logger: ILogger;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string,
        logger: ILogger, steps: DependencyInstallerInterfaces.IStepsDeclaration, id: string) {
        this.installerInfo = installerInfo;
        this.steps = steps;
        this.softwareVersion = softwareVersion;
        this.installDestination = installTo;
        this.logger = logger;
        this.id = id;
    }

    public run(): Q.Promise<any> {
        var self = this;
        return tacoUtils.TelemetryHelper.generate("Installer:" + this.id,
            telemetry => this.download()
            .then(function (): Q.Promise<any> {
                telemetry.step("install");
                return self.install();
            })
            .then(function (): Q.Promise<any> {
                telemetry.step("updateVariables");
                return self.updateVariables();
            })
            .then(function (): Q.Promise<any> {
                telemetry.step("postInstall");
                return self.postInstall();
            })
            .then(function (): void {
                telemetry.step("logSuccess");
                self.logger.log(resources.getString("Success"));
            }));
    }

    protected download(): Q.Promise<any> {
        if (!this.steps.download) {
            return Q({});
        }

        this.logger.log(resources.getString("DownloadingLabel"));

        switch (process.platform) {
            case "win32":
                return this.downloadWin32();
            case "darwin":
                return this.downloadDarwin()
                    .then(function (): void {
                        // After we download something on Mac OS, we need to change the owner of the cached installer back to the current user, otherwise
                        // they won't be able to delete their taco_home folder without admin privileges
                        wrench.chownSyncRecursive(InstallerBase.InstallerCache, parseInt(process.env.SUDO_UID), parseInt(process.env.SUDO_GID));
                    });
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
        }
    }

    protected downloadWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected downloadDarwin(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected install(): Q.Promise<any> {
        if (!this.steps.install) {
            return Q({});
        }

        this.logger.log(resources.getString("InstallingLabel"));

        switch (process.platform) {
            case "win32":
                return this.installWin32();
            case "darwin":
                return this.installDarwin();
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
        }
    }

    protected installWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected installDarwin(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected updateVariables(): Q.Promise<any> {
        if (!this.steps.updateVariables) {
            return Q({});
        }

        this.logger.log(resources.getString("SettingSystemVariablesLabel"));

        switch (process.platform) {
            case "win32":
                return this.updateVariablesWin32();
            case "darwin":
                return this.updateVariablesDarwin();
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
        }
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected updateVariablesDarwin(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected postInstall(): Q.Promise<any> {
        if (!this.steps.postInstall) {
            return Q({});
        }

        this.logger.log(resources.getString("ConfiguringLabel"));

        switch (process.platform) {
            case "win32":
                return this.postInstallWin32();
            case "darwin":
                return this.postInstallDarwin();
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, process.platform));
        }
    }

    protected postInstallWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected postInstallDarwin(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }
}

export = InstallerBase;

/// <enable code="SA1400" />