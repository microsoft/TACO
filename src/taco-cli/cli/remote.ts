/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/request.d.ts" />
/// <reference path="../../typings/node.d.ts" />
"use strict";

import fs = require ("fs");
import https = require ("https");
import nopt = require ("nopt");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");
import request = require ("request");
import util = require ("util");

import CordovaHelper = require ("./utils/cordovaHelper");
import ConnectionSecurityHelper = require ("./remoteBuild/connectionSecurityHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import loggerHelper = tacoUtility.LoggerHelper;
import UtilHelper = tacoUtility.UtilHelper;

interface ICliSession {
    question: (question: string, callback: (answer: string) => void) => void;
    close: () => void
};

/*
 * Remote
 *
 * handles "taco remote"
 */
class Remote extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static HttpTimeoutMS: number = 20000;
    private static KnownOptions: Nopt.CommandData = {};
    private static ShortHands: Nopt.ShortFlags = {};
    /**
     * Mockable CLI for test purposes
     */
    public static CliSession: ICliSession = null;
    public subcommands: commands.ICommand[] = [
        {
            // taco remote remove <platform>
            run: Remote.remove,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return remoteData.remain[0] && /^(remove|rm)$/i.test(remoteData.remain[0]);
            }
        },
        {
            // taco remote list
            run: Remote.list,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return remoteData.remain[0] && /^(list|ls)$/i.test(remoteData.remain[0]);
            }
        },
        {
            // taco remote add [platform]
            run: Remote.add,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return remoteData.remain[0] && /^add$/i.test(remoteData.remain[0]);
            }
        }
    ];

    public name: string = "remote";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        // remote is a custom command so we should always try and handle it
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = tacoUtility.ArgsHelper.parseArguments(Remote.KnownOptions, Remote.ShortHands, args, 0);

        return parsedOptions;
    }

    private static remove(remoteData: commands.ICommandData): Q.Promise<any> {
        if (remoteData.remain.length < 2) {
            throw errorHelper.get(TacoErrorCodes.CommandRemoteDeleteNeedsPlatform);
        }

        var platform: string = (remoteData.remain[1]).toLowerCase();

        return Settings.loadSettings().catch<Settings.ISettings>(function (err: any): Settings.ISettings {
            // No settings or the settings were corrupted: start from scratch
            return {};
        }).then(function (settings: Settings.ISettings): Q.Promise<any> {
            if (!(settings.remotePlatforms && platform in settings.remotePlatforms)) {
                throw errorHelper.get(TacoErrorCodes.CommandRemoteDeletePlatformNotAdded, platform);
            } else {
                delete settings.remotePlatforms[platform];
                return Settings.saveSettings(settings);
            }
        }).then(function (): void {
            logger.log(resources.getString("CommandRemoteRemoveSuccessful", platform));
        });
    }

    private static list(remoteData: commands.ICommandData): Q.Promise<any> {
        return Settings.loadSettings().catch<Settings.ISettings>(function (err: any): Settings.ISettings {
            // No settings or the settings were corrupted: start from scratch
            return {};
        }).then(function (settings: Settings.ISettings): void {
            var platforms = settings.remotePlatforms && Object.keys(settings.remotePlatforms).map(function (platform: string): INameDescription {
                    var remote = settings.remotePlatforms[platform];
                    var url = util.format("[%s] %s://%s:%d/%s",
                        remote.secure ? resources.getString("CommandRemoteListSecured") : resources.getString("CommandRemoteListNotSecured"),
                        remote.secure ? "https" : "http",
                        remote.host,
                        remote.port,
                        remote.mountPoint);
                    return { name: platform, description: url };
            });
            
            if (platforms && platforms.length > 0) {
                logger.log(resources.getString("CommandRemoteListPrelude"));
                logger.logLine();
                var header = { name: resources.getString("CommandRemoteListPlatformHeader"), description: resources.getString("CommandRemoteListDescriptionHeader") };
                loggerHelper.logNameDescriptionTableWithHeader(header, platforms, null, null, " ");
            } else {
                logger.log(resources.getString("CommandRemoteListNoPlatforms"));
            }
        });
    }

    private static add(remoteData: commands.ICommandData): Q.Promise<any> {
        var platform: string = (remoteData.remain[1] || "ios").toLowerCase();

        return CordovaHelper.getSupportedPlatforms().then(function (filter: (platform: string) => boolean): Q.Promise<any> {
            if (!filter(platform)) {
                throw errorHelper.get(TacoErrorCodes.RemoteBuildUnsupportedPlatform, platform);
            }

            logger.log(resources.getString("CommandRemoteHeader"));

            return Remote.queryUserForRemoteConfig()
                .then(Remote.acquireCertificateIfRequired)
                .then(Remote.constructRemotePlatformSettings)
                .then(Remote.saveRemotePlatformSettings.bind(Remote, platform))
                .then(function (): void {
                    logger.log(resources.getString("CommandRemoteSettingsStored", Settings.settingsFile));
             });
        });
    }

    private static queryUserForRemoteConfig(): Q.Promise<{ host: string; port: number; pin: number }> {
        var hostPromise = Q.defer<{ host: string }>();
        var portPromise = Q.defer<{ host: string; port: number }>();
        var pinPromise = Q.defer<{ host: string; port: number; pin: number }>();

        var cliSession = Remote.CliSession ? Remote.CliSession : readline.createInterface({ input: process.stdin, output: process.stdout });

        // Query the user for the host, port, and PIN, but don't keep asking questions if they input a known-invalid argument
        cliSession.question(resources.getString("CommandRemoteQueryHost"), function (hostAnswer: string): void {
            hostPromise.resolve({ host: hostAnswer });
        });
        hostPromise.promise.done(function (host: { host: string }): void {
            cliSession.question(resources.getString("CommandRemoteQueryPort"), function (portAnswer: string): void {
                var port: number = parseInt(portAnswer);
                if (port > 0 && port < 65536) {
                    // Port looks valid
                    portPromise.resolve({ host: host.host, port: port });
                } else {
                    portPromise.reject(errorHelper.get(TacoErrorCodes.CommandRemoteInvalidPort, portAnswer));
                }
            });
        }, function (err: any): void {
            portPromise.reject(err);
        });
        portPromise.promise.done(function (hostAndPort: { host: string; port: number }): void {
            cliSession.question(resources.getString("CommandRemoteQueryPin"), function (pinAnswer: string): void {
                var pin: number = parseInt(pinAnswer);
                if (pinAnswer && !Remote.pinIsValid(pin)) {
                    // A pin was provided but it is invalid
                    pinPromise.reject(errorHelper.get(TacoErrorCodes.CommandRemoteInvalidPin, pinAnswer));
                } else {
                    pinPromise.resolve({ host: hostAndPort.host, port: hostAndPort.port, pin: pin });
                }
            });
        }, function (err: any): void {
            pinPromise.reject(err);
        });
        return pinPromise.promise.finally(function (): void {
            // Make sure to close the session regardless of error conditions otherwise the node process won't terminate.
            cliSession.close();
        });
    }

    private static pinIsValid(pin: number): boolean {
        return pin && pin >= 100000 && pin <= 999999;
    }

    private static acquireCertificateIfRequired(hostPortAndPin: { host: string; port: number; pin: number }): Q.Promise<{ host: string; port: number; certName?: string; secure: boolean }> {
        if (hostPortAndPin.pin) {
            // Secure connection: try to acquire a cert and store it in the windows cert store
            var certificateUrl = util.format("https://%s:%d/certs/%d", hostPortAndPin.host, hostPortAndPin.port, hostPortAndPin.pin);
            var deferred = Q.defer<string>();
            // Note: we set strictSSL to be false here because we don't yet know who the server is. We are vulnerable to a MITM attack in this first instance here
            request.get({ uri: certificateUrl, strictSSL: false, encoding: null, timeout: Remote.HttpTimeoutMS }, function (error: any, response: any, body: Buffer): void {
                if (error) {
                    // Error contacting the build server
                    deferred.reject(Remote.getFriendlyHttpError(error, hostPortAndPin.host, hostPortAndPin.port, certificateUrl, !!hostPortAndPin.pin));
                } else {
                    if (response.statusCode !== 200) {
                        // Invalid PIN specified
                        deferred.reject(errorHelper.get(TacoErrorCodes.CommandRemoteRejectedPin));
                    } else {
                        ConnectionSecurityHelper.saveCertificate(body, hostPortAndPin.host).then(function (certName: string): void {
                            deferred.resolve(certName.trim());
                        }, function (err: tacoUtility.TacoError): void {
                            deferred.reject(err);
                        });
                    }
                }
            });
            return deferred.promise.then(function (certName: string): { host: string; port: number; certName?: string; secure: boolean } {
                return { host: hostPortAndPin.host, port: hostPortAndPin.port, certName: certName, secure: true };
            });
        }

        return Q({ host: hostPortAndPin.host, port: hostPortAndPin.port, secure: false });
    }

    private static findRemoteMountPath(hostPortAndCert: { host: string; port: number; certName?: string; secure: boolean }): Q.Promise<string> {
        var mountDiscoveryUrl = util.format("http%s://%s:%d/modules/%s", hostPortAndCert.certName ? "s" : "", hostPortAndCert.host, hostPortAndCert.port, "taco-remote");
        return ConnectionSecurityHelper.getAgent(hostPortAndCert).then(function (agent: https.Agent): Q.Promise<string> {
            var options: request.Options = {
                url: mountDiscoveryUrl,
                agent: agent,
                timeout: Remote.HttpTimeoutMS
            };

            var deferred = Q.defer<string>();
            request.get(options, function (error: any, response: any, body: any): void {
                if (error) {
                    deferred.reject(Remote.getFriendlyHttpError(error, hostPortAndCert.host, hostPortAndCert.port, mountDiscoveryUrl, !!hostPortAndCert.certName));
                } else if (response.statusCode !== 200) {
                    deferred.reject(errorHelper.get(TacoErrorCodes.CommandRemoteCantFindRemoteMount, mountDiscoveryUrl));
                } else {
                    deferred.resolve(body);
                }
            });

            return deferred.promise;
        });
    }

    private static saveRemotePlatformSettings(platform: string, data: Settings.IRemoteConnectionInfo): Q.Promise<any> {
        return Settings.loadSettings().catch<Settings.ISettings>(function (err: any): Settings.ISettings {
            // No settings or the settings were corrupted: start from scratch
            return {};
        }).then(function (settings: Settings.ISettings): Q.Promise<any> {
            if (!settings.remotePlatforms) {
                settings.remotePlatforms = {};
                }

            settings.remotePlatforms[platform] = data;
            return Settings.saveSettings(settings);
        });
    }

    private static constructRemotePlatformSettings(hostPortAndCert: { host: string; port: number; certName?: string; secure: boolean }): Q.Promise<Settings.IRemoteConnectionInfo> {
        return Remote.findRemoteMountPath(hostPortAndCert).then(function (mountPoint: string): Settings.IRemoteConnectionInfo {
            var setting: Settings.IRemoteConnectionInfo = {
                host: hostPortAndCert.host,
                port: hostPortAndCert.port,
                secure: hostPortAndCert.certName ? true : false,
                mountPoint: mountPoint
            };
            if (hostPortAndCert.certName) {
                setting.certName = hostPortAndCert.certName;
            }

            return setting;
        });
    }

    private static getFriendlyHttpError(error: any, host: string, port: number, url: string, secure: boolean): Error {
        if (error.code === "ECONNREFUSED") {
            return errorHelper.get(TacoErrorCodes.CommandRemoteConnectionRefused, util.format("%s://%s:%s", secure ? "https" : "http", host, port));
        } else if (error.code === "ENOTFOUND") {
            return errorHelper.get(TacoErrorCodes.CommandRemoteNotfound, host);
        } else if (error.code === "ETIMEDOUT") {
            return errorHelper.get(TacoErrorCodes.CommandRemoteTimedout, host, port);
        } else if (error.code === "ECONNRESET") {
            if (!secure) {
                return errorHelper.get(TacoErrorCodes.RemoteBuildNonSslConnectionReset, url);
            } else {
                return errorHelper.get(TacoErrorCodes.RemoteBuildSslConnectionReset, url);
            }
        } else {
            return errorHelper.wrap(TacoErrorCodes.ErrorHttpGet, error, url);
        }
    }
}

export = Remote;
