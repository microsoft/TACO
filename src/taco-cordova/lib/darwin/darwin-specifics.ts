/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../../typings/nconf.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import nconf = require ("nconf");
import path = require ("path");
import Q = require ("q");

import HostSpecifics = require ("../host-specifics");
import deps = require ("./darwin-dependencies");

class DarwinSpecifics implements HostSpecifics.IHostSpecifics {
    public defaults(base: { [key: string]: any }): { [key: string]: any } {
        var osxdefaults: { [key: string]: any } = {
            nativeDebugProxyPort: 3001,
            webDebugProxyDevicePort: 9221,
            webDebugProxyRangeMin: 9222,
            webDebugProxyRangeMax: 9322
        };
        Object.keys(osxdefaults).forEach(function (key: string): void {
            if (!(key in base)) {
                base[key] = osxdefaults[key];
            }
        });

        return base;
    }

    // Note: we acquire dependencies for deploying and debugging here rather than in taco-remote-lib because it may require user intervention, and taco-remote-lib may be acquired unattended in future.
    public initialize(conf: TacoRemote.IDict): Q.Promise<any> {
        return deps.askInstallHomebrew(conf);
    }
}

var darwinSpecifics: HostSpecifics.IHostSpecifics = new DarwinSpecifics();
export = darwinSpecifics;