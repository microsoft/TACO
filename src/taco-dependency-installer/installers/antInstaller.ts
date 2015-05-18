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

import Q = require ("q");

import InstallerBase = require ("./installerBase");

class AntInstaller extends InstallerBase {
    constructor(installerInfo: DependencyInstallerInterfaces.IInstallerData, softwareVersion: string, installTo: string) {
        super(installerInfo, softwareVersion, installTo);
    }

    protected downloadWin32(): Q.Promise<any> {
        return Q.resolve({});
    }

    protected installWin32(): Q.Promise<any> {
        return Q.resolve({});
    }

    protected updateVariablesWin32(): Q.Promise<any> {
        return Q.resolve({});
    }
}

export = AntInstaller;

/// <enable code="SA1400" />