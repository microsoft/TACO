/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/adm-zip.d.ts" />
/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/wrench.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import admZip = require ("adm-zip");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import request = require ("request");
import wrench = require ("wrench");

import InstallerBase = require ("./installerBase");
import installerProtocol = require ("../installerProtocol");
import installerUtils = require ("../utils/installerUtils");
import resources = require ("../resources/resourceManager");

class AntInstaller extends InstallerBase {
    private installerArchive: string;

    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, socketHandle: NodeJSNet.Socket) {
        super(installerInfo, softwareVersion, installTo, socketHandle);
    }

    protected downloadWin32(): Q.Promise<any> {
        this.installerArchive = path.join(InstallerBase.InstallerCache, "ant", "win32", this.softwareVersion, path.basename(this.installerInfo.installSource));

        return this.downloadDefault();
    }

    protected installWin32(): Q.Promise<any> {
        return this.installDefault();
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        // Initialize values
        var antHomeName: string = "ANT_HOME";
        var antHomeValue: string = path.join(this.installDestination, "apache-ant-1.9.3");
        var addToPath: string = path.join(antHomeValue, "bin");

        return installerUtils.setEnvironmentVariableIfNeededWin32(antHomeName, antHomeValue, this.socketHandle)
            .then(function (): Q.Promise<any> {
                return installerUtils.addToPathIfNeededWin32(addToPath);
            });
    }

    private downloadDefault(): Q.Promise<any> {
        // Prepare expected archive file properties
        var expectedProperties: installerUtils.IExpectedProperties = {
            bytes: this.installerInfo.bytes,
            sha1: this.installerInfo.sha1
        };

        // Prepare download options
        var options: request.Options = {
            uri: this.installerInfo.installSource,
            method: "GET",
        };

        // Download the archive
        return installerUtils.downloadFile(options, this.installerArchive, expectedProperties);
    }

    private installDefault(): Q.Promise<any> {
        // Extract the archive
        var templateZip = new admZip(this.installerArchive);

        if (!fs.existsSync(this.installDestination)) {
            wrench.mkdirSyncRecursive(this.installDestination, 511); // 511 decimal is 0777 octal
        }

        templateZip.extractAllTo(this.installDestination);

        return Q.resolve({});
    }
}

export = AntInstaller;

/// <enable code="SA1400" />