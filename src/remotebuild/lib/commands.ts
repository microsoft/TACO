/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
"use strict";
import Q = require ("q");

import RemoteBuildConf = require ("./remoteBuildConf");
import server = require ("./server");

class Commands {
    public static Tasks: { [key: string]: { execute(config: RemoteBuildConf): Q.Promise<any>; } } = {
        start: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.start(config);
            },
        },
        test: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.test(config);
            }
        },
        resetServerCert: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.resetServerCert(config);
            }
        },
        generateClientCert: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.generateClientCert(config);
            }
        },
        help: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return Q.resolve<void>(null);
            }
        },
        version: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return Q.resolve<void>(null);
            }
        }
    };
}

export = Commands;
