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

import installerProtocol = require ("../elevatedInstallerProtocol");
import installerUtils = require ("../utils/installerUtils");
import resources = require ("../resources/resourceManager");
import tacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import ILogger = installerProtocol.ILogger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;

class InstallerBase {
    protected static InstallerCache: string = path.join(tacoUtils.UtilHelper.tacoHome, "third-party-installers");

    protected installerInfo: DependencyInstallerInterfaces.IInstallerData;
    protected softwareVersion: string;
    protected installDestination: string;
    protected logger: ILogger;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, logger: ILogger) {
        this.installerInfo = installerInfo;
        this.softwareVersion = softwareVersion;
        this.installDestination = installTo;
        this.logger = logger;
    }

    public run(): Q.Promise<any> {
        // We currently only support Windows for dependency installation
        // TODO (DevDiv 1172346): Support Mac OS as well
        if (process.platform === "win32") {
            return this.runWin32();
        } else {
            return Q.reject(resources.getString("UnsupportedPlatform", process.platform));
        }
    }

    protected runWin32(): Q.Promise<any> {
        var self = this;

        // Log progress
        this.logger.log(resources.getString("DownloadingLabel"));

        return this.downloadWin32()
            .then(function (): Q.Promise<any> {
                self.logger.log(resources.getString("InstallingLabel"));

                return self.installWin32();
            })
            .then(function (): Q.Promise<any> {
                self.logger.log(resources.getString("SettingSystemVariablesLabel"));

                return self.updateVariablesWin32();
            })
            .then(function (): Q.Promise<any> {
                // For now, there is no need to have a different post-install step for each platform
                return self.postInstall();
            })
            .then(function (): void {
                self.logger.log(resources.getString("Success"));
            });
    }

    protected postInstall(): Q.Promise<any> {
        // Default behavior is no-op
        return Q.resolve({});
    }

    protected downloadWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected installWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        throw errorHelper.get(TacoErrorCodes.AbstractMethod);
    }
}

export = InstallerBase;

/// <enable code="SA1400" />