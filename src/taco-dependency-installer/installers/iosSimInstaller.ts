/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />

/// <disable code="SA1400" justification="protected statements are currently broken in StyleCop" />

"use strict";

import os = require ("os");
import Q = require ("q");

import InstallerBase = require ("./installerBase");
import resources = require ("../resources/resourceManager");

class IosSimInstaller extends InstallerBase {
    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string, socketHandle: NodeJSNet.Socket) {
        super(installerInfo, softwareVersion, installTo, socketHandle);
    }
}

export = IosSimInstaller;

/// <enable code="SA1400" />