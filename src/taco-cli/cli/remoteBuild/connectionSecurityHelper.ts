/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import https = require ("https");
import os = require ("os");
import path = require ("path");
import Q = require ("q");

import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtils = require ("taco-utils");

import logger = tacoUtils.Logger;
import UtilHelper = tacoUtils.UtilHelper;

class ConnectionSecurityHelper {
    public static getAgent(connectionInfo: { secure: boolean; host: string; port: number; certName?: string }): Q.Promise<https.Agent> {
        if (!connectionInfo.secure) {
            return Q<https.Agent>(null);
        }

        var bufferDeferred = Q.defer<Buffer>();
        switch (os.platform()) {
            case "win32":
                var certScriptPath = path.resolve(__dirname, "win32", "certificates.ps1");
                var certLoadProcess = child_process.spawn("powershell", ["-executionpolicy", "unrestricted", "-file", certScriptPath, "get", connectionInfo.certName]);
                var output = "";
                certLoadProcess.stdout.on("data", function (data: any): void {
                    output += data.toString();
                });
                certLoadProcess.on("error", function (err: Error): void {
                    bufferDeferred.reject(errorHelper.wrap(TacoErrorCodes.ErrorCertificateLoad, err, connectionInfo.certName));
                });
                certLoadProcess.on("close", function (code: number): void {
                    if (code) {
                        if (code === 1) {
                            bufferDeferred.reject(errorHelper.get(TacoErrorCodes.NoCertificateFound, connectionInfo.certName));
                        } else {
                            logger.logError(output);
                            bufferDeferred.reject(errorHelper.get(TacoErrorCodes.GetCertificateFailed));
                        }
                    } else {
                        bufferDeferred.resolve(new Buffer(output, "base64"));
                    }
                });
                break;
            case "linux":
            case "darwin":
                var certPath = path.resolve(UtilHelper.tacoHome, "certs", encodeURIComponent(connectionInfo.host), "cert.pfx");
                fs.readFile(certPath, bufferDeferred.makeNodeResolver());
                break;
            default:
                throw errorHelper.get(TacoErrorCodes.UnsupportedPlatform, os.platform());
        }

        return bufferDeferred.promise.then(function (certificate: Buffer): https.Agent {
            return new https.Agent({
                pfx: certificate,
                rejectUnauthorized: true
            });
        });
    }

    /*
     * Given a buffer containing certificate data, save the certificate to the system in an appropriate manner,
     * and return a promise for the name of the certificate that can be used to retrieve it later
     */
    public static saveCertificate(certificateData: Buffer, host: string): Q.Promise<string> {
        var deferred = Q.defer<string>();

        switch (os.platform()) {
            case "win32":
                var base64Certificate = certificateData.toString("base64");
                // Save the certificate in the user's certificate store via a powershell script
                var certScriptPath = path.resolve(__dirname, "win32", "certificates.ps1");
                var certSaveProcess = child_process.spawn("powershell", ["-executionpolicy", "unrestricted", "-file", certScriptPath, "set"]);
                var output: string = "";

                certSaveProcess.stdin.write(base64Certificate);
                certSaveProcess.stdin.end();
                certSaveProcess.stdout.on("data", function (data: any): void {
                    // Strip off any CN= prefix
                    output += data.toString().replace(/^CN=/, "");
                });
                certSaveProcess.stderr.on("data", function (data: any): void {
                    console.error(data.toString());
                });
                certSaveProcess.on("error", function (err: Error): void {
                    deferred.reject(errorHelper.wrap(TacoErrorCodes.ErrorCertificateSave, err));
                });
                certSaveProcess.on("close", function (code: number): void {
                    if (code) {
                        logger.logError(output);
                        deferred.reject(errorHelper.get(TacoErrorCodes.ErrorCertificateSaveWithErrorCode, code));
                    } else {
                        deferred.resolve(output);
                    }
                });
                break;
            case "linux":
            case "darwin":
                var certPath = path.resolve(UtilHelper.tacoHome, "certs", encodeURIComponent(host));
                UtilHelper.createDirectoryIfNecessary(certPath);
                // The folder should only be accessible to the specific user
                fs.chmod(certPath, "0700", function (err: NodeJS.ErrnoException): void {
                    if (err) {
                        deferred.reject(errorHelper.wrap(TacoErrorCodes.ErrorCertificatePathChmod, err, certPath));
                    }

                    var certFilePath: string = path.join(certPath, "cert.pfx");
                    fs.writeFile(certFilePath, certificateData, function (err: NodeJS.ErrnoException): void {
                        if (err) {
                            deferred.reject(errorHelper.wrap(TacoErrorCodes.ErrorCertificateSaveToPath, err, certFilePath));
                        }

                        deferred.resolve(host);
                    });
                });
                break;
            default:
                deferred.reject(errorHelper.get(TacoErrorCodes.UnsupportedPlatform, os.platform()));
        }

        return deferred.promise;
    }
}

export = ConnectionSecurityHelper;
