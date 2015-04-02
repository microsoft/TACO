/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/taco-utils.d.ts" />
/// <reference path="../../typings/express.d.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import os = require ("os");
import Q = require ("q");

class HostSpecifics {
    private static CachedSpecifics: HostSpecifics.IHostSpecifics;
    public static get hostSpecifics(): HostSpecifics.IHostSpecifics {
        if (!HostSpecifics.CachedSpecifics) {
            switch (os.platform()) {
                case "darwin":
                    HostSpecifics.CachedSpecifics = require("./darwin/darwin-specifics");
                    break;
                case "win32":
                    HostSpecifics.CachedSpecifics = require("./win32/win32-specifics");
                    break;
                default:
                    throw new Error("UnsupportedPlatform");
            }
        }

        return HostSpecifics.CachedSpecifics;
    }
}

module HostSpecifics {
    export interface IHostSpecifics {
        defaults(base: { [key: string]: any }): { [key: string]: any };
        initialize(conf: TacoRemote.IDict): Q.Promise<any>;
    }
}

export = HostSpecifics;