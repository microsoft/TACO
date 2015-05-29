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
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import request = require ("request");

import resources = require ("../resources/resourceManager");
import tacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;

class InstallerBase {
    protected static InstallerCache: string = path.join(tacoUtils.UtilHelper.tacoHome, "third-party-installers");

    protected installerInfo: DependencyInstallerInterfaces.IInstallerData;
    protected softwareVersion: string;
    protected installDestination: string;
    protected socketHandle: NodeJSNet.Socket;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, socketHandle: NodeJSNet.Socket) {
        this.installerInfo = installerInfo;
        this.softwareVersion = softwareVersion;
        this.installDestination = installTo;
        this.socketHandle = socketHandle;
    }

    public run(): Q.Promise<any> {
        // We currently only support Windows for dependency installation
        // TODO (DevDiv 1172346): Support Mac OS as well
        var platform: string = os.platform();

        if (platform === "win32") {
            return this.runWin32();
        } else {
            return Q.reject(resources.getString("UnsupportedPlatform", platform));
        }
    }

    protected runWin32(): Q.Promise<any> {
        return this.downloadWin32()
            .then(this.installWin32.bind(this))
            .then(this.updateVariablesWin32.bind(this));
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