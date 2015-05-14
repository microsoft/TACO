/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />

"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");

import HostSpecifics = require ("../hostSpecifics");
import resources = require ("../../resources/resourceManager");
import TacoRemoteConfig = require ("../tacoRemoteConfig");
import utils = require ("taco-utils");

class Win32Specifics implements HostSpecifics.IHostSpecifics {
    public defaults(base: { [key: string]: any }): { [key: string]: any } {
        var win32: { [key: string]: any } = {
        };
        Object.keys(win32).forEach(function (key: string): void {
            if (!(key in base)) {
                base[key] = win32[key];
            }
        });

        return base;
    }

    // Note: we acquire dependencies for deploying and debugging here rather than in taco-remote-lib because it may require user intervention, and taco-remote-lib may be acquired unattended in future.
    public initialize(conf: TacoRemoteConfig): Q.Promise<any> {
        return Q({});
    }
}

var win32Specifics: HostSpecifics.IHostSpecifics = new Win32Specifics();
export = win32Specifics;
