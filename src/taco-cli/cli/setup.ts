/// <reference path="../../typings/taco-utils.d.ts" />
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
import tacoUtility = require ("taco-utils");
import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import level = logger.Level;
import resources = tacoUtility.ResourcesManager;
import UtilHelper = tacoUtility.UtilHelper;
import util = require ("util");

import Settings = require ("./utils/settings");
import ConnectionSecurity = require ("./remote-build/connection-security");

interface ICliSession {
    question: (question: string, callback: (answer: string) => void) => void;
    close: () => void
};

/*
 * Setup
 *
 * handles "taco setup"
 */
class Setup extends commands.TacoCommandBase implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.CommandData = {};
    private static ShortHands: Nopt.ShortFlags = {};
    /**
     * Mockable CLI for test purposes
     */
    public static CliSession: ICliSession = null;
    public subcommands: commands.ICommand[] = [
        {
            // taco setup remote
            run: Setup.remote,
            canHandleArgs: function (setupData: commands.ICommandData): boolean {
                return setupData.remain[0] && setupData.remain[0].toLowerCase() === "remote";
            }
        }
    ];

    public name: string = "setup";
    public info: commands.ICommandInfo;

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        // setup is a custom command so we should always try and handle it
        return true;
    }

    public parseArgs(args: string[]): commands.ICommandData {
        var parsedOptions = UtilHelper.parseArguments(Setup.KnownOptions, Setup.ShortHands, args, 0);

        return parsedOptions;
    }

    private static remote(setupData: commands.ICommandData): Q.Promise<any> {
        var platform: string = (setupData.remain[1] || "ios").toLowerCase();

        logger.logNormalLine(resources.getString("command.setup.remote.header"));

        return Setup.queryUserForRemoteConfig()
        .then(Setup.acquireCertificateIfRequired)
        .then(Setup.constructRemotePlatformSettings)
        .then(Setup.saveRemotePlatformSettings.bind(Setup, platform))
        .catch(function (err: any): void {
            if (err.message) {
                logger.logErrorLine(err.message);
            } else {
                logger.logErrorLine(err);
            }

            // rethrow any errors so we can catch them in test code
            throw err;
        });
    }

    private static queryUserForRemoteConfig(): Q.Promise<{ host: string; port: number; pin: number }> {
        var hostPromise = Q.defer<{ host: string }>();
        var portPromise = Q.defer<{ host: string; port: number }>();
        var pinPromise = Q.defer<{ host: string; port: number; pin: number }>();

        var cliSession = Setup.CliSession ? Setup.CliSession : readline.createInterface({ input: process.stdin, output: process.stdout });

        // Query the user for the host, port, and PIN, but don't keep asking questions if they input a known-invalid argument
        cliSession.question(resources.getString("command.setup.remote.query.host"), function (hostAnswer: string): void {
            hostPromise.resolve({ host: hostAnswer });
        });
        hostPromise.promise.then(function (host: { host: string }): void {
            cliSession.question(resources.getString("command.setup.remote.query.port"), function (portAnswer: string): void {
                var port: number = parseInt(portAnswer);
                if (port > 0) {
                    // Port looks valid
                    portPromise.resolve({ host: host.host, port: port });
                } else {
                    portPromise.reject(new Error(resources.getString("command.setup.remote.invalidPort", port)));
                }
            });
        });
        portPromise.promise.then(function (hostAndPort: { host: string; port: number }): void {
            cliSession.question(resources.getString("command.setup.remote.query.pin"), function (pinAnswer: string): void {
                var pin: number = parseInt(pinAnswer);
                if (pinAnswer && !Setup.pinIsValid(pin)) {
                    // A pin was provided but it is invalid
                    pinPromise.reject(new Error(resources.getString("command.setup.remote.invalidPin", pinAnswer)));
                } else {
                    pinPromise.resolve({ host: hostAndPort.host, port: hostAndPort.port, pin: pin });
                }
            });
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
            request.get({ uri: certificateUrl, strictSSL: false, encoding: null }, function (error: any, response: any, body: Buffer): void {
                if (error) {
                    // Error contacting the build server
                    deferred.reject(new Error(resources.getString("ErrorHTTPGet", certificateUrl, error)));
                } else {
                    if (response.statusCode !== 200) {
                        // Invalid PIN specified
                        deferred.reject(new Error(resources.getString("command.setup.remote.rejectedPin")));
                    } else {
                        ConnectionSecurity.saveCertificate(body, hostPortAndPin.host).then(function (certName: string): void {
                            deferred.resolve(certName.trim());
                        }, function (err: Error): void {
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
        return ConnectionSecurity.getAgent(hostPortAndCert).then(function (agent: https.Agent): Q.Promise<string> {
            var options: request.Options = {
                url: mountDiscoveryUrl,
                agent: agent
            };

            var deferred = Q.defer<string>();
            request.get(options, function (error: any, response: any, body: any): void {
                if (error) {
                    deferred.reject(error);
                } else if (response.statusCode !== 200) {
                    deferred.reject(new Error(resources.getString("command.setup.cantFindRemoteMount", mountDiscoveryUrl)));
                } else {
                    deferred.resolve(body);
                }
            });

            return deferred.promise;
        });
    }

    private static saveRemotePlatformSettings(platform: string, data: Settings.IRemoteConnectionInfo): Q.Promise<any> {
        return Settings.loadSettings(true).catch<Settings.ISettings>(function (err: any): Settings.ISettings {
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
        return Setup.findRemoteMountPath(hostPortAndCert).then(function (mountPoint: string): Settings.IRemoteConnectionInfo {
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
}

export = Setup;