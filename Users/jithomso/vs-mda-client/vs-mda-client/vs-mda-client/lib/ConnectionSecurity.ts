/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import path = require('path');
import https = require('https');
import res = require('./resources');
import fs = require('fs');

export function getAgent(argv: any): () => https.Agent {
    if (argv.buildServerUrl.indexOf('https://') !== 0) {
        return function () {
            return null;
        }
    }
    var certificate: Buffer;
    if (!argv.certFile) {
        // TODO:
        // Try to fetch the cert by invoking a bundled exe to query the certificate store on windows. Do something else on mac?
        throw new Error(res.getString('RemoteBuildClientCertMissing'));
    } else if (argv.certFile !== '-') {
        // TODO: Change away from this approach, requiring the VS change how it invokes us
        var pfxPath = path.join(process.env['APPDATA'], 'Microsoft', 'VisualStudio', 'MDA', 'certs', 'vs-mda-remote-client.pfx');
        if (!fs.existsSync(pfxPath)) {
            throw new Error(res.getString('RemoteBuildClientCertMissing'));
        }
        certificate = fs.readFileSync(pfxPath);
    } else {
        // this.certFile === '-';
        do {
            var bytesRead = 0;
            var BUFSIZE = 4096;
            var bufs = [];
            try {
                var buf = new Buffer(BUFSIZE);
                bytesRead = fs.readSync((<any>process.stdin).fd, buf, 0, BUFSIZE, 0);
                bufs.push(buf);
            } catch (e) {
                if (e.code === 'EAGAIN') {
                    throw new Error(res.getString('MustPipeCertificate'));
                } else if (e.code === 'EOF') {
                    break;
                }
                throw e;
            }
        } while (bytesRead !== 0);
        certificate = Buffer.concat(bufs);
    }
    
    return function () {
        return new https.Agent({
            pfx: certificate,
            rejectUnauthorized: true
        });
    }
}