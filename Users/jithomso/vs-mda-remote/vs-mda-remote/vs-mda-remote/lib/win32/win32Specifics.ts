/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import child_process = require('child_process');
import express = require('express');
import fs = require('fs');
import path = require('path');
import Q = require('q');

import bi = require('../buildInfo');
import OSSpecifics = require('../OSSpecifics');
import resources = require('../resources');

class Win32Specifics implements OSSpecifics.IOsSpecifics {
    defaults(base: any): any {
        var windefaults = {
            'serverDir': path.join(process.env.APPDATA, 'remote-builds'),
            'allowsEmulate': false,
            'lang': "en", // TODO
            'suppressVisualStudioMessage': false,
        };
        for (var key in windefaults) {
            if (!(key in base)) {
                base[key] = windefaults[key];
            }
        }
        return base;
    }

    initialize(): Q.Promise<any> {
        return Q({});
    }

    printUsage(language: string): void {
        console.info(resources.getString(language, "UsageInformation"));
    }

    resetServerCert(conf: OSSpecifics.Conf): Q.Promise<any> {
        return Q({});
    }

    generateClientCert(conf: OSSpecifics.Conf): Q.Promise<number> {
        return Q(0);
    }

    initializeServerCerts(conf: OSSpecifics.Conf): Q.Promise<OSSpecifics.ICertStore> {
        return Q({
            newCerts: false,
            getKey: function () { throw new Error("Not Implemented"); },
            getCert: function () { throw new Error("Not Implemented"); },
            getCA: function () { throw new Error("Not Implemented"); }
        });
    }

    removeAllCertsSync(conf: OSSpecifics.Conf): void {
        return;
    }

    createBuildProcess(): child_process.ChildProcess {
        var child = child_process.fork('./lib/win32/win32Build', [], { silent: true });
        return child;
    }

    downloadBuild(buildInfo: bi.BuildInfo, req: express.Request, res: express.Response, callback: Function): void {
        callback("Not implemented", buildInfo);
    }

    downloadClientCerts(req: express.Request, res: express.Response): void {
         res.send(404, "Not implemented");
    }

    emulateBuild(req: express.Request, res: express.Response): void {
        res.send(404, "Not implemented");
   }

    deployBuild(req: express.Request, res: express.Response): void {
        res.send(404, "Not implemented");
    }

    runBuild(req: express.Request, res: express.Response): void {
        res.send(404, "Not implemented");
    }

    debugBuild(req: express.Request, res: express.Response): void {
        res.send(404, "Not implemented");
    }

    getDebugPort(req: express.Request, res: express.Response): void {
        res.send(404, "Not implemented");
    }
}

var win32Specifics: OSSpecifics.IOsSpecifics = new Win32Specifics();
export = win32Specifics;