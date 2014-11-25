/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import OSSpecifics = require('OSSpecifics');
var osSpecifics = OSSpecifics.osSpecifics;

module Server {
    export function resetServerCert(conf: OSSpecifics.Conf) : Q.IPromise<any> {
        return osSpecifics.resetServerCert(conf);
    }

    export function generateClientCert(conf: OSSpecifics.Conf): Q.IPromise<any> {
        return osSpecifics.generateClientCert(conf);
    }

    export function start(conf: OSSpecifics.Conf): Q.IPromise<any> {
        return Q({});
    }
}

export = Server;