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
import tacoUtils = require ("taco-utils");

class InstallerBase {
    protected static InstallerCache: string = path.join(tacoUtils.UtilHelper.tacoHome, "third-party-installers");

    protected installerInfo: DependencyInstallerInterfaces.IInstallerData;
    protected softwareVersion: string;
    protected installDestination: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string) {
        this.installerInfo = installerInfo;
        this.softwareVersion = softwareVersion;
        this.installDestination = installTo;
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
        throw new Error("AbstractMethodCall");
    }

    protected installWin32(): Q.Promise<any> {
        throw new Error("AbstractMethodCall");
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        throw new Error("AbstractMethodCall");
    }
}

export = InstallerBase;

/// <enable code="SA1400" />