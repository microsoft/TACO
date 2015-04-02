/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/rimraf.d.ts" />
"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import nconf = require ("nconf");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");
import rimraf = require ("rimraf");
import util = require ("util");

import tacoUtils = require ("taco-utils");

import resources = tacoUtils.ResourcesManager;
import utils = tacoUtils.UtilHelper;
import HostSpecifics = require ("../host-specifics");

var exec = child_process.exec;

module Certs {
    interface IOptions {
        days?: number;
        cn?: string;
        country?: string;
    };

    var debug = false;
    module CERT_DEFAULTS {
        export var days = 1825; // 5 years
        export var country = "US";
        export var ca_cn = "taco-remote." + os.hostname() + ".Certificate-Authority"; // NOTE: Changing certificates away from referring to vs-mda-remote may require changes to VS, until the CLI can configure certs appropriately
        export var pfx_name = "taco-remote." + os.hostname() + ".Client-Certificate";
        export var client_cn = "taco-remote." + os.hostname(); // Note: we need the client cert name to be a prefix of the CA cert so both are retrieved in the client. Otherwise it complains about self signed certificates
    };

    var certStore: HostSpecifics.ICertStore = null;

    export interface ICliHandler {
        question: (question: string, answerCallback: (answer: string) => void) => void;
        close: () => void;
    }

    export function resetServerCert(conf: HostSpecifics.IConf, yesOrNoHandler?: ICliHandler): Q.Promise<any> {
        var certsDir = path.join(conf.get("serverDir"), "certs");

        if (!fs.existsSync(certsDir)) {
            return initializeServerCerts(conf);
        }

        var shouldProceedDeferred = Q.defer();
        yesOrNoHandler = yesOrNoHandler || readline.createInterface({ input: process.stdin, output: process.stdout });
        var answerCallback = function (answer: string): void {
            answer = answer.toLowerCase();
            if (resources.getString("OSXResetServerCertResponseYes").split("\n").indexOf(answer) !== -1) {
                yesOrNoHandler.close();
                shouldProceedDeferred.resolve(true);
            } else if (resources.getString("OSXResetServerCertResponseNo").split("\n").indexOf(answer) !== -1) {
                yesOrNoHandler.close();
                shouldProceedDeferred.resolve(false);
            } else {
                yesOrNoHandler.question(resources.getString("OSXResetServerCertPleaseYesNo") + os.EOL, answerCallback);
            }
        };
        yesOrNoHandler.question(resources.getString("OSXResetServerCertQuery") + os.EOL, answerCallback);
        return shouldProceedDeferred.promise.
            then(function (shouldProceed: boolean): Q.Promise<any> {
                if (shouldProceed) {
                    rimraf.sync(certsDir);
                    return initializeServerCerts(conf);
                }

                return Q({});
            });
    };

    export function generateClientCert(conf: HostSpecifics.IConf): Q.Promise<number> {
        var certsDir = path.join(conf.get("serverDir"), "certs");
        var caKeyPath = path.join(certsDir, "ca-key.pem");
        var caCertPath = path.join(certsDir, "ca-cert.pem");
        if (!fs.existsSync(caKeyPath) || !fs.existsSync(caCertPath)) {
            var error = resources.getStringForLanguage(conf.get("lang"), "CAFilesNotFound", caKeyPath, caCertPath);
            return Q(0).thenReject(error);
        }

        return makeClientPinAndSslCert(caKeyPath, caCertPath, certsDir, certOptionsFromConf(conf), conf).
            then(function (pin: number): number {
                if (utils.argToBool(conf.get("suppressVisualStudioMessage"))) {
                    return pin;
                }

                printVisualStudioSetupToConsole(conf, pin);
                return pin;
            });
    };

    export function initializeServerCerts(conf: HostSpecifics.IConf): Q.Promise<HostSpecifics.ICertStore> {
        var certsDir = path.join(conf.get("serverDir"), "certs");
        var certPaths = {
            certsDir: certsDir,
            caKeyPath: path.join(certsDir, "ca-key.pem"),
            caCertPath: path.join(certsDir, "ca-cert.pem"),
            serverKeyPath: path.join(certsDir, "server-key.pem"),
            serverCertPath: path.join(certsDir, "server-cert.pem"),
            newCerts: false
        };

        var certsExist = fs.existsSync(certPaths.caCertPath) && fs.existsSync(certPaths.serverKeyPath) && fs.existsSync(certPaths.serverCertPath);
        certPaths.newCerts = !certsExist;
        var promise: Q.Promise<any>;
        if (certsExist) {
            promise = isExpired(certPaths.caCertPath).
                then(function (hasExpired: boolean): Q.Promise<boolean> {
                    if (hasExpired) {
                        return Q(true);
                    }

                    return isExpired(certPaths.serverCertPath);
                });
        } else {
            promise = Q(true); // do not exist, so true -> need making
        }

        promise = promise.then(function (shouldMake: boolean): Q.Promise<any> {
            if (!shouldMake) {
                return Q({});
            }

            utils.createDirectoryIfNecessary(certsDir);
            var options = certOptionsFromConf(conf);
            return makeSelfSigningCACert(certPaths.caKeyPath, certPaths.caCertPath, options).
                then(function (): Q.Promise<void> {
                    return makeSelfSignedCert(certPaths.caKeyPath, certPaths.caCertPath, certPaths.serverKeyPath, certPaths.serverCertPath, options, conf);
                }).
                then(function (): void {
                    certPaths.newCerts = true;
                });
        }).then(function (): HostSpecifics.ICertStore {
            certStore = {
                newCerts: certPaths.newCerts,
                getKey: function (): Buffer { return fs.readFileSync(certPaths.serverKeyPath); },
                getCert: function (): Buffer { return fs.readFileSync(certPaths.serverCertPath); },
                getCA: function (): Buffer { return fs.readFileSync(certPaths.caCertPath); }
            };
            return certStore;
            });
        return promise;
    }

    export function getServerCerts(): Q.Promise<HostSpecifics.ICertStore> {
        if (certStore) {
            return Q(certStore);
        } else {
            return Q.reject<HostSpecifics.ICertStore>(new Error(resources.getString("CertificatesNotConfigured")));
        }
    }

    export function isExpired(certPath: string): Q.Promise<boolean> {
        return displayCert(certPath, ["dates"]).
            then(function (output: { stdout: string; stderr: string }): boolean {
                var notAfter = new Date(output.stdout.substring(output.stdout.indexOf("notAfter=") + 9, output.stdout.length - 1));
                return (notAfter.getTime() < new Date().getTime());
            });
    };

    // display fields an array of any of these: 'subject', 'issuer', 'dates', etc. (see https://www.openssl.org/docs/apps/x509.html)
    export function displayCert(certPath: string, displayFields: string[]): Q.Promise<{ stdout: string; stderr: string }> {
        // openssl x509 -noout -in selfsigned-cert.pem -subject -issuer -dates
        var args = "x509 -noout -in " + certPath;
        (displayFields || []).forEach(function (f: string): void {
            args += " -" + f;
        });
        return openSslPromise(args);
    };

    export function removeAllCertsSync(conf: HostSpecifics.IConf): void {
        var certsDir = path.join(conf.get("serverDir"), "certs");
        if (fs.existsSync(certsDir)) {
            rimraf.sync(certsDir);
        }
    }

    export function downloadClientCerts(pinString: string): string {
        purgeExpiredPinBasedClientCertsSync();
        var clientCertsDir = path.join(nconf.get("serverDir"), "certs", "client");

        var pin = parseInt(pinString);
        if (isNaN(pin)) {
            throw { code: 400, id: "InvalidPin" };
        }

        var pinDir = path.join(clientCertsDir, "" + pin);
        var pfx = path.join(pinDir, "client.pfx");
        if (!fs.existsSync(pfx)) {
            throw { code: 404, id: "ClientCertNotFoundForPIN" };
        }

        return pfx;
    }

    export function invalidatePIN(pinString: string): void {
        var pinDir = path.join(nconf.get("serverDir"), "certs", "client", "" + parseInt(pinString));
        rimraf(pinDir, function (): void { });
    }

    export function purgeExpiredPinBasedClientCertsSync(): void {
        var clientCertsDir = path.join(nconf.get("serverDir"), "certs", "client");
        if (!fs.existsSync(clientCertsDir)) {
            return;
        }

        var pinTimeoutInMinutes = nconf.get("pinTimeout");
        var expiredIfOlderThan = new Date().getTime() - (pinTimeoutInMinutes * 60 * 1000);
        fs.readdirSync(clientCertsDir).forEach(function (f: string): void {
            var pfx = path.join(clientCertsDir, f, "client.pfx");
            if (fs.existsSync(pfx) && fs.statSync(pfx).mtime.getTime() < expiredIfOlderThan) {
                rimraf.sync(path.join(clientCertsDir, f));
            }
        });
    };

    // Makes a CA cert that will be used for self-signing our server and client certs.
    export function makeSelfSigningCACert(caKeyPath: string, caCertPath: string, options?: IOptions): Q.Promise<{ stdout: string; stderr: string }> {
        options = options || {};
        var days = options.days || CERT_DEFAULTS.days;
        var country = options.country || CERT_DEFAULTS.country;
        var cn = CERT_DEFAULTS.ca_cn;
        return openSslPromise("req -newkey rsa:4096 -x509 -days " + days + " -nodes -subj /C=" + country + "/CN=" + cn + " -keyout " + caKeyPath + " -out " + caCertPath);
    };

    // Makes a new private key and certificate signed with the CA.
    export function makeSelfSignedCert(caKeyPath: string, caCertPath: string, outKeyPath: string, outCertPath: string, options: IOptions, conf: HostSpecifics.IConf): Q.Promise<void> {
        options = options || {};
        var csrPath = path.join(path.dirname(outCertPath), "CSR-" + path.basename(outCertPath));
        var days = options.days || CERT_DEFAULTS.days;
        var cn = options.cn || os.hostname();

        var cnfPath = path.join(conf.get("serverDir"), "certs", "openssl.cnf");
        writeConfigFile(cnfPath, conf);

        return openSslPromise("genrsa -out " + outKeyPath + " 1024").
            then(function (): Q.Promise<{}> {
            return openSslPromise("req -new -subj /CN=" + cn + " -key " + outKeyPath + " -out " + csrPath + " -config " + cnfPath);
        }).
            then(function (): Q.Promise<{}> {
            return openSslPromise("x509 -req -days " + days + " -in " + csrPath + " -CA " + caCertPath + " -CAkey " + caKeyPath +
                " -extensions v3_req -extfile " + cnfPath + " -set_serial 01 -out " + outCertPath);
        }).
            then(function (): void {
            fs.unlinkSync(csrPath);
        });
    };

    export function verifyCert(caCertPath: string, certPath: string): Q.Promise<{ stdout: string; stderr: string }> {
        return openSslPromise("verify -CAfile " + caCertPath + " " + certPath);
    };

    function openSslPromise(args: string): Q.Promise<{ stdout: string; stderr: string }> {
        var deferred = Q.defer<{ stdout: string; stderr: string }>();

        exec("openssl " + args, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (debug) {
                console.info("exec openssl " + args);
                console.info("stdout: %s", stdout);
                console.info("stderr: %s", stderr);
            }

            if (error) {
                deferred.reject(error);
            } else {
                deferred.resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
            }
        });

        return deferred.promise;
    }

    function certOptionsFromConf(conf: HostSpecifics.IConf): IOptions {
        var options: IOptions = {};
        if (conf.get("certExpirationdays") < 1) {
            console.info(resources.getString("CertExpirationInvalid", conf.get("certExpirationdays"), CERT_DEFAULTS.days));
        } else {
            options.days = conf.get("certExpirationdays");
        }

        return options;
    }

    function writeConfigFile(cnfPath: string, conf: HostSpecifics.IConf): void {
        var net = os.networkInterfaces();
        var cnf = "[req]\ndistinguished_name = req_distinguished_name\nreq_extensions = v3_req\n[req_distinguished_name]\nC_default = US\n[ v3_req ]\nbasicConstraints = CA:FALSE\nkeyUsage = nonRepudiation, digitalSignature, keyEncipherment\nsubjectAltName = @alt_names\n[alt_names]\n";
        
        // If the user has provided a hostname then respect it
        var hostname: string = conf.get("hostname") || os.hostname();
        cnf += util.format("DNS.1 = %s\n", hostname);

        var ipCount = 1;
        for (var key in net) {
            for (var i = 0; i < net[key].length; i++) {
                if (net[key][i].address && !net[key][i].internal) {
                    cnf += util.format("IP.%d = %s\n", ipCount, net[key][i].address);
                    ipCount++;
                }
            }
        }

        fs.writeFileSync(cnfPath, cnf);
    }

    function makeClientPinAndSslCert(caKeyPath: string, caCertPath: string, certsDir: string, options: IOptions, conf: HostSpecifics.IConf): Q.Promise<number> {
        options = options || {};
        options.cn = CERT_DEFAULTS.client_cn;
        var clientCertsPath = path.join(certsDir, "client");
        utils.createDirectoryIfNecessary(clientCertsPath);
        // 6 digit random pin (Math.random excludes 1.0)
        var pin = 100000 + Math.floor(Math.random() * 900000);
        var pinDir = path.join(clientCertsPath, "" + pin);
        var pfxPath = path.join(pinDir, "client.pfx");
        var clientKeyPath = path.join(pinDir, "client-key.pem");
        var clientCertPath = path.join(pinDir, "client-cert.pem");

        utils.createDirectoryIfNecessary(pinDir);
        return makeSelfSignedCert(caKeyPath, caCertPath, clientKeyPath, clientCertPath, options, conf).
            then(function (): Q.Promise<{}> {
                return makePfx(caCertPath, clientKeyPath, clientCertPath, pfxPath);
            }).
            then(function (): number {
                fs.unlinkSync(clientKeyPath);
                fs.unlinkSync(clientCertPath);
                return pin;
            });
    }

    function makePfx(caCertPath: string, keyPath: string, certPath: string, outPfxPath: string, options?: IOptions): Q.Promise<{ stdout: string; stderr: string }> {
        options = options || {};
        var name = CERT_DEFAULTS.pfx_name;
        return openSslPromise("pkcs12 -export -in " + certPath + " -inkey " + keyPath + " -certfile " + caCertPath + " -out " + outPfxPath +
            " -name \'" + name + "\' -password pass:");
    }

    // TODO: Make this explain how to configure taco-cli?
    // TODO: How do we want this to work in the world where it is shared between VS and taco-cli?
    function printVisualStudioSetupToConsole(conf: HostSpecifics.IConf, pin: number): void {
        var host = conf.get("hostname") || os.hostname();
        var port = conf.get("port");
        var pinTimeoutInMinutes = conf.get("pinTimeout");
        console.info(resources.getString("OSXCertSetupInformation", host, port, pin));
        if (pinTimeoutInMinutes) {
            console.info(resources.getString("OSXCertSetupPinTimeout", pinTimeoutInMinutes));
        } else {
            console.info(resources.getString("OSXCertSetupNoPinTimeout"));
        }

        console.info("taco-remote generateClientCert");
        console.info("");
    };
}

export = Certs;