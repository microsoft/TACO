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

module HostSpecifics {
    export interface IHostSpecifics {
        defaults(base: { [key: string]: any }): { [key: string]: any };
        initialize(conf: TacoRemote.IDict): Q.Promise<any>;
    }

    export var hostSpecifics: IHostSpecifics;
    var cachedSpecifics: IHostSpecifics;
    Object.defineProperty(HostSpecifics, "hostSpecifics", {
        get: function (): IHostSpecifics {
            if (!cachedSpecifics) {
                var platform: string = os.platform();
                cachedSpecifics = require("./" + platform + "/" + platform + "-specifics");
            }

            return cachedSpecifics;
        }
    });
}

export = HostSpecifics;