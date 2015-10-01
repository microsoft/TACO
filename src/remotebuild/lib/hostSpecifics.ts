/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/express.d.ts" />
"use strict";

import child_process = require ("child_process");
import express = require ("express");
import os = require ("os");
import Q = require ("q");

import RemoteBuildConf = require ("./remoteBuildConf");

class HostSpecifics {
    private static cachedSpecifics: HostSpecifics.IHostSpecifics;
    public static get hostSpecifics(): HostSpecifics.IHostSpecifics {
        if (!HostSpecifics.cachedSpecifics) {
            switch (os.platform()) {
                case "darwin":
                    HostSpecifics.cachedSpecifics = require("./darwin/darwinSpecifics");
                    break;
                case "win32":
                    HostSpecifics.cachedSpecifics = require("./win32/win32Specifics");
                    break;
                default:
                    throw new Error("UnsupportedPlatform");
            }
        }

        return HostSpecifics.cachedSpecifics;
    }
}

module HostSpecifics {
    export interface ICertStore {
        newCerts: boolean;
        getKey: () => any;
        getCert: () => any;
        getCA: () => any;
    }

    export interface IHostSpecifics {
        defaults(base: { [key: string]: any }): { [key: string]: any };
        initialize(conf: RemoteBuildConf): Q.Promise<any>;

        resetServerCert(conf: RemoteBuildConf): Q.Promise<any>;
        generateClientCert(conf: RemoteBuildConf): Q.Promise<number>;
        initializeServerCerts(conf: RemoteBuildConf): Q.Promise<ICertStore>;
        getServerCerts(): Q.Promise<ICertStore>;
        removeAllCertsSync(conf: RemoteBuildConf): void;
        downloadClientCerts(request: express.Request, response: express.Response): void;

        getHttpsAgent(conf: RemoteBuildConf): Q.Promise<NodeJSHttp.Agent>;
    }
}

export = HostSpecifics;
