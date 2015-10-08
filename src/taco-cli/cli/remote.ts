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
import HelpModule = require ("./help");
import projectHelper = require ("./utils/projectHelper");
import resources = require ("../resources/resourceManager");
import Settings = require ("./utils/settings");
import TacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import loggerHelper = tacoUtility.LoggerHelper;
import telemetryHelper = tacoUtility.TelemetryHelper;
import UtilHelper = tacoUtility.UtilHelper;

import ICommandTelemetryProperties = tacoUtility.ICommandTelemetryProperties;

interface ICliSession {
    question: (question: string, callback: (answer: string) => void) => void;
    close: () => void;
};

/**
 * Remote
 *
 * handles "taco remote"
 */
class Remote extends commands.TacoCommandBase {
    /**
     * Mockable CLI for test purposes
     */
    public static cliSession: ICliSession = null;

    private static HTTP_TIMEOUT_IN_MS: number = 20000;
    private static KNOWN_OPTIONS: Nopt.CommandData = {};
    private static SHORT_HANDS: Nopt.ShortFlags = {};

    public subcommands: commands.ICommand[] = [
        {
            // taco remote remove <platform>
            name: "remove",
            run: Remote.remove,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return remoteData.remain[0] && /^(remove|rm)$/i.test(remoteData.remain[0]);
            }
        },
        {
            // taco remote list
            name: "list",
            run: Remote.list,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return remoteData.remain[0] && /^(list|ls)$/i.test(remoteData.remain[0]);
            }
        },
        {
            // taco remote add [platform]
            name: "add",
            run: Remote.add,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return remoteData.remain[0] && /^add$/i.test(remoteData.remain[0]);
            }
        },
        {
            // taco remote [unknown]
            name: "help",
            run: Remote.help,
            canHandleArgs: function (remoteData: commands.ICommandData): boolean {
                return true;
            }
        }
    ];

    public name: string = "remote";
    public info: commands.ICommandInfo;

    /**
     * Generates the telemetry properties for the remote operation
     */
    private static generateTelemetryProperties(subCommand: string, platform?: string, isSecure?: boolean): Q.Promise<ICommandTelemetryProperties> {

        return projectHelper.getCurrentProjectTelemetryProperties().then(function (telemetryProperties: ICommandTelemetryProperties): Q.Promise<ICommandTelemetryProperties> {
            telemetryProperties["subCommand"] = telemetryHelper.telemetryProperty(subCommand);

            if (platform) {
                telemetryProperties["platform"] = telemetryHelper.telemetryProperty(platform);
            }

            if (typeof (isSecure) !== "undefined") {
                telemetryProperties["isSecure"] = telemetryHelper.telemetryProperty(isSecure || false);
            }

            return Q.resolve(telemetryProperties);
        });
    }

    private static remove(remoteData: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        if (remoteData.remain.length < 2) {
            throw errorHelper.get(TacoErrorCodes.CommandRemoteDeleteNeedsPlatform);
        }

        var platform: string = (remoteData.remain[1]).toLowerCase();
        var telemetryProperties: ICommandTelemetryProperties = {};

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
        }).then(function (): Q.Promise<ICommandTelemetryProperties> {
            return Remote.generateTelemetryProperties("remove", platform);
        });
    }

    private static list(remoteData: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        return Settings.loadSettings().catch<Settings.ISettings>(function (err: any): Settings.ISettings {
            // No settings or the settings were corrupted: start from scratch
            return {};
        }).then(function (settings: Settings.ISettings): void {
            var platforms: INameDescription [] = Object.keys(settings.remotePlatforms || {}).map(function (platform: string): INameDescription {
                    var remote: Settings.IRemoteConnectionInfo = settings.remotePlatforms && settings.remotePlatforms[platform];
                    var url: string = util.format("[%s] %s://%s:%d/%s",
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
                var header: INameDescription = { name: resources.getString("CommandRemoteListPlatformHeader"), description: resources.getString("CommandRemoteListDescriptionHeader") };
                loggerHelper.logNameDescriptionTableWithHeader(header, platforms, null, null, " ");
            } else {
                logger.log(resources.getString("CommandRemoteListNoPlatforms"));
            }
        }).then(function (): Q.Promise<ICommandTelemetryProperties> {
            return Remote.generateTelemetryProperties("list");
        });
    }

    private static add(remoteData: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        var platform: string = (remoteData.remain[1] || "ios").toLowerCase();
        var remoteInfo: Settings.IRemoteConnectionInfo;
        return CordovaHelper.getSupportedPlatforms().then(function (supportedPlatforms: CordovaHelper.IDictionary<any>): Q.Promise<any> {
            if (supportedPlatforms && !(platform in supportedPlatforms)) {
                throw errorHelper.get(TacoErrorCodes.RemoteBuildUnsupportedPlatform, platform);
            }

            logger.log(resources.getString("CommandRemoteHeader"));

            return Remote.queryUserForRemoteConfig()
                .then(Remote.acquireCertificateIfRequired)
                .then(Remote.constructRemotePlatformSettings)
                .then(function (remoteConnectionInfo: Settings.IRemoteConnectionInfo): Q.Promise<Settings.IRemoteConnectionInfo> {
                    remoteInfo = remoteConnectionInfo;
                    return Q.resolve(remoteInfo);
                })
                .then(Remote.saveRemotePlatformSettings.bind(Remote, platform))
                .then(function (): void {
                    logger.log(resources.getString("CommandRemoteSettingsStored", Settings.settingsFile));

                    // Print the onboarding experience
                    logger.log(resources.getString("OnboardingExperienceTitle"));
                    loggerHelper.logList([
                        "HowToUseCommandBuildPlatform",
                        "HowToUseCommandEmulatePlatform",
                        "HowToUseCommandRunPlatform"].map((msg: string) => resources.getString(msg)));

                    ["",
                        "HowToUseCommandHelp",
                        "HowToUseCommandDocs"].forEach((msg: string) => logger.log(resources.getString(msg)));
             });
        }).then(function (): Q.Promise<ICommandTelemetryProperties> {
            return Remote.generateTelemetryProperties("add", platform, remoteInfo.secure);
        });
    }

    private static queryUserForRemoteConfig(): Q.Promise<{ host: string; port: number; pin: number }> {
        var hostPromise: Q.Deferred<{ host: string }> = Q.defer<{ host: string }>();
        var portPromise: Q.Deferred<{ host: string; port: number }> = Q.defer<{ host: string; port: number }>();
        var pinPromise: Q.Deferred<{ host: string; port: number; pin: number }> = Q.defer<{ host: string; port: number; pin: number }>();

        var cliSession: ICliSession = Remote.cliSession ? Remote.cliSession : readline.createInterface({ input: process.stdin, output: process.stdout });

        // Query the user for the host, port, and PIN, but don't keep asking questions if they input a known-invalid argument
        cliSession.question(resources.getString("CommandRemoteQueryHost"), function (hostAnswer: string): void {
            hostPromise.resolve({ host: hostAnswer });
        });
        hostPromise.promise.done(function (host: { host: string }): void {
            cliSession.question(resources.getString("CommandRemoteQueryPort"), function (portAnswer: string): void {
                var port: number = parseInt(portAnswer, 10);
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
                var pin: number = parseInt(pinAnswer, 10);
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
            var certificateUrl: string = util.format("https://%s:%d/certs/%d", hostPortAndPin.host, hostPortAndPin.port, hostPortAndPin.pin);
            var deferred: Q.Deferred<string> = Q.defer<string>();
            // Note: we set strictSSL to be false here because we don't yet know who the server is. We are vulnerable to a MITM attack in this first instance here
            request.get({ uri: certificateUrl, strictSSL: false, encoding: null, timeout: Remote.HTTP_TIMEOUT_IN_MS }, function (error: any, response: any, body: Buffer): void {
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
        var mountDiscoveryUrl: string = util.format("http%s://%s:%d/modules/%s", hostPortAndCert.certName ? "s" : "", hostPortAndCert.host, hostPortAndCert.port, "taco-remote");
        return ConnectionSecurityHelper.getAgent(hostPortAndCert).then(function (agent: https.Agent): Q.Promise<string> {
            // TODO: Remove the casting once we've get some complete/up-to-date .d.ts files. See https://github.com/Microsoft/TACO/issues/18
            var options: request.Options = <request.Options> {
                url: mountDiscoveryUrl,
                agent: agent,
                timeout: Remote.HTTP_TIMEOUT_IN_MS
            };

            var deferred: Q.Deferred<string> = Q.defer<string>();
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
        if (error.code.indexOf("CERT_") !== -1) {
            return errorHelper.get(TacoErrorCodes.InvalidRemoteBuildClientCert);
        } else if (error.code === "ECONNREFUSED") {
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

    private static help(remoteData: commands.ICommandData): Q.Promise<ICommandTelemetryProperties> {
        remoteData.original.unshift("remote");
        remoteData.remain.unshift("remote");
        return new HelpModule().run(remoteData).then(function (): Q.Promise<ICommandTelemetryProperties> {
            return Q(<ICommandTelemetryProperties> {});
        });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        // remote is a custom command so we should always try and handle it
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Remote.KNOWN_OPTIONS, Remote.SHORT_HANDS, args, 0);

        return parsedOptions;
    }
}

export = Remote;
