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
    protected static installerCache: string = path.join(tacoUtils.UtilHelper.tacoHome, "third-party-installers");

    protected installerInfo: DependencyInstallerInterfaces.IInstallerData;
    protected steps: DependencyInstallerInterfaces.IStepsDeclaration;
    protected softwareVersion: string;
    protected installDestination: string;
    protected logger: ILogger;
    protected telemetry: tacoUtils.TelemetryGenerator;

    private id: string;

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
        var self: InstallerBase = this;
        return tacoUtils.TelemetryHelper.generate("Installer:" + this.id,
            (telemetry: tacoUtils.TelemetryGenerator) => {
                this.telemetry = telemetry; // So any method can access it
                return this.download()
                    .then(function (): Q.Promise<any> {
                        return self.install();
                    })
                    .then(function (): Q.Promise<any> {
                        return self.updateVariables();
                    })
                    .then(function (): Q.Promise<any> {
                        return self.postInstall();
                    })
                    .then(function (): void {
                        telemetry.step("logSuccess");
                        self.logger.log(resources.getString("Success"));
                    });
            });
    }

    protected download(): Q.Promise<any> {
        if (!this.steps.download) {
            return Q({});
        }

        this.telemetry.step("download");
        this.logger.log(resources.getString("DownloadingLabel"));

        switch (tacoUtils.ProcessUtils.getProcess().platform) {
            case "win32":
                return this.downloadWin32();
            case "darwin":
                return this.downloadDarwin()
                    .then(function (): void {
                        // After we download something on Mac OS, we need to change the owner of the cached installer back to the current user, otherwise
                        // they won't be able to delete their taco_home folder without admin privileges
                        wrench.chownSyncRecursive(InstallerBase.installerCache,
                            parseInt(tacoUtils.ProcessUtils.getProcess().env.SUDO_UID, 10), parseInt(tacoUtils.ProcessUtils.getProcess().env.SUDO_GID, 10));
                    });
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, tacoUtils.ProcessUtils.getProcess().platform));
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

        this.telemetry.step("install");
        this.logger.log(resources.getString("InstallingLabel"));

        switch (tacoUtils.ProcessUtils.getProcess().platform) {
            case "win32":
                return this.installWin32();
            case "darwin":
                return this.installDarwin();
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, tacoUtils.ProcessUtils.getProcess().platform));
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

        this.telemetry.step("updateVariables");
        this.logger.log(resources.getString("SettingSystemVariablesLabel"));

        switch (tacoUtils.ProcessUtils.getProcess().platform) {
            case "win32":
                return this.updateVariablesWin32();
            case "darwin":
                return this.updateVariablesDarwin();
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, tacoUtils.ProcessUtils.getProcess().platform));
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

        this.telemetry.step("postInstall");
        this.logger.log(resources.getString("ConfiguringLabel"));

        switch (tacoUtils.ProcessUtils.getProcess().platform) {
            case "win32":
                return this.postInstallWin32();
            case "darwin":
                return this.postInstallDarwin();
            default:
                return Q.reject<number>(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, tacoUtils.ProcessUtils.getProcess().platform));
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
