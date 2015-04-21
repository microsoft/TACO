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
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");
import rimraf = require ("rimraf");
import util = require ("util");

import tacoUtils = require ("taco-utils");

import resources = tacoUtils.ResourcesManager;
import utils = tacoUtils.UtilHelper;
import HostSpecifics = require ("../hostSpecifics");
import RemoteBuildConf = require ("../remoteBuildConf");

var exec = child_process.exec;

class Certs {
    private static Debug = false;
    private static CERT_DEFAULTS = {
        days: 1825, // 5 years
        country: "US",
        ca_cn: "remotebuild." + os.hostname() + ".Certificate-Authority", // NOTE: Changing certificates away from referring to vs-mda-remote may require changes to VS, until the CLI can configure certs appropriately
        pfx_name: "remotebuild." + os.hostname() + ".Client-Certificate",
        client_cn: "remotebuild." + os.hostname(), // Note: we need the client cert name to be a prefix of the CA cert so both are retrieved in the client. Otherwise it complains about self signed certificates
    };

    private static CertStore: HostSpecifics.ICertStore = null;

    public static resetServerCert(conf: RemoteBuildConf, yesOrNoHandler?: Certs.ICliHandler): Q.Promise<any> {
        var certsDir = path.join(conf.serverDir, "certs");

        if (!fs.existsSync(certsDir)) {
            return Certs.initializeServerCerts(conf);
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
                    return Certs.initializeServerCerts(conf);
                }

                return Q({});
            });
    }

    public static generateClientCert(conf: RemoteBuildConf): Q.Promise<number> {
        var certsDir = path.join(conf.serverDir, "certs");
        var caKeyPath = path.join(certsDir, "ca-key.pem");
        var caCertPath = path.join(certsDir, "ca-cert.pem");
        if (!fs.existsSync(caKeyPath) || !fs.existsSync(caCertPath)) {
            var error = resources.getString("CAFilesNotFound", caKeyPath, caCertPath);
            return Q(0).thenReject(error);
        }

        return Certs.makeClientPinAndSslCert(caKeyPath, caCertPath, certsDir, Certs.certOptionsFromConf(conf), conf).
            then(function (pin: number): number {
                if (utils.argToBool(conf.get("suppressSetupMessage"))) {
                    return pin;
                }

                Certs.printSetupInstructionsToConsole(conf, pin);
                return pin;
            });
    }

    public static initializeServerCerts(conf: RemoteBuildConf): Q.Promise<HostSpecifics.ICertStore> {
        var certsDir = path.join(conf.serverDir, "certs");
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
            promise = Certs.isExpired(certPaths.caCertPath).
                then(function (hasExpired: boolean): Q.Promise<boolean> {
                    if (hasExpired) {
                        return Q(true);
                    }

                    return Certs.isExpired(certPaths.serverCertPath);
                });
        } else {
            promise = Q(true); // do not exist, so true -> need making
        }

        promise = promise.then(function (shouldMake: boolean): Q.Promise<any> {
            if (!shouldMake) {
                return Q({});
            }

            utils.createDirectoryIfNecessary(certsDir);
            var options = Certs.certOptionsFromConf(conf);
            return Certs.makeSelfSigningCACert(certPaths.caKeyPath, certPaths.caCertPath, options).
                then(function (): Q.Promise<void> {
                return Certs.makeSelfSignedCert(certPaths.caKeyPath, certPaths.caCertPath, certPaths.serverKeyPath, certPaths.serverCertPath, options, conf);
                }).
                then(function (): void {
                    certPaths.newCerts = true;
                });
        }).then(function (): HostSpecifics.ICertStore {
            Certs.CertStore = {
                newCerts: certPaths.newCerts,
                getKey: function (): Buffer { return fs.readFileSync(certPaths.serverKeyPath); },
                getCert: function (): Buffer { return fs.readFileSync(certPaths.serverCertPath); },
                getCA: function (): Buffer { return fs.readFileSync(certPaths.caCertPath); }
            };
            return Certs.CertStore;
            });
        return promise;
    }

    public static getServerCerts(): Q.Promise<HostSpecifics.ICertStore> {
        if (Certs.CertStore) {
            return Q(Certs.CertStore);
        } else {
            return Q.reject<HostSpecifics.ICertStore>(new Error(resources.getString("CertificatesNotConfigured")));
        }
    }

    public static isExpired(certPath: string): Q.Promise<boolean> {
        return Certs.displayCert(certPath, ["dates"]).
            then(function (output: { stdout: string; stderr: string }): boolean {
                var notAfter = new Date(output.stdout.substring(output.stdout.indexOf("notAfter=") + 9, output.stdout.length - 1));
                return (notAfter.getTime() < new Date().getTime());
            });
    }

    // display fields an array of any of these: 'subject', 'issuer', 'dates', etc. (see https://www.openssl.org/docs/apps/x509.html)
    public static displayCert(certPath: string, displayFields: string[]): Q.Promise<{ stdout: string; stderr: string }> {
        // openssl x509 -noout -in selfsigned-cert.pem -subject -issuer -dates
        var args = "x509 -noout -in " + certPath;
        (displayFields || []).forEach(function (f: string): void {
            args += " -" + f;
        });
        return Certs.openSslPromise(args);
    }

    public static removeAllCertsSync(conf: RemoteBuildConf): void {
        var certsDir = path.join(conf.serverDir, "certs");
        if (fs.existsSync(certsDir)) {
            rimraf.sync(certsDir);
        }
    }

    public static downloadClientCerts(conf: RemoteBuildConf, pinString: string): string {
        Certs.purgeExpiredPinBasedClientCertsSync(conf);
        var clientCertsDir = path.join(conf.serverDir, "certs", "client");

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

    public static invalidatePIN(conf: RemoteBuildConf, pinString: string): void {
        var pinDir = path.join(conf.serverDir, "certs", "client", "" + parseInt(pinString));
        rimraf(pinDir, function (): void { });
    }

    public static purgeExpiredPinBasedClientCertsSync(conf: RemoteBuildConf): void {
        var clientCertsDir = path.join(conf.serverDir, "certs", "client");
        if (!fs.existsSync(clientCertsDir)) {
            return;
        }

        var pinTimeoutInMinutes = conf.pinTimeout;
        var expiredIfOlderThan = new Date().getTime() - (pinTimeoutInMinutes * 60 * 1000);
        fs.readdirSync(clientCertsDir).forEach(function (f: string): void {
            var pfx = path.join(clientCertsDir, f, "client.pfx");
            if (fs.existsSync(pfx) && fs.statSync(pfx).mtime.getTime() < expiredIfOlderThan) {
                rimraf.sync(path.join(clientCertsDir, f));
            }
        });
    }

    // Makes a CA cert that will be used for self-signing our server and client certs.
    // Exported for tests
    public static makeSelfSigningCACert(caKeyPath: string, caCertPath: string, options?: Certs.ICertOptions): Q.Promise<{ stdout: string; stderr: string }> {
        options = options || {};
        var days = options.days || Certs.CERT_DEFAULTS.days;
        var country = options.country || Certs.CERT_DEFAULTS.country;
        var cn = Certs.CERT_DEFAULTS.ca_cn;
        return Certs.openSslPromise("req -newkey rsa:4096 -x509 -days " + days + " -nodes -subj /C=" + country + "/CN=" + cn + " -keyout " + caKeyPath + " -out " + caCertPath);
    }

    // Makes a new private key and certificate signed with the CA.
    // Exported for tests
    public static makeSelfSignedCert(caKeyPath: string, caCertPath: string, outKeyPath: string, outCertPath: string, options: Certs.ICertOptions, conf: RemoteBuildConf): Q.Promise<void> {
        options = options || {};
        var csrPath = path.join(path.dirname(outCertPath), "CSR-" + path.basename(outCertPath));
        var days = options.days || Certs.CERT_DEFAULTS.days;
        var cn = options.cn || os.hostname();

        var cnfPath = path.join(conf.serverDir, "certs", "openssl.cnf");
        Certs.writeConfigFile(cnfPath, conf);

        return Certs.openSslPromise("genrsa -out " + outKeyPath + " 1024").
            then(function (): Q.Promise<{}> {
            return Certs.openSslPromise("req -new -subj /CN=" + cn + " -key " + outKeyPath + " -out " + csrPath + " -config " + cnfPath);
        }).
            then(function (): Q.Promise<{}> {
            return Certs.openSslPromise("x509 -req -days " + days + " -in " + csrPath + " -CA " + caCertPath + " -CAkey " + caKeyPath +
                " -extensions v3_req -extfile " + cnfPath + " -set_serial 01 -out " + outCertPath);
        }).
            then(function (): void {
            fs.unlinkSync(csrPath);
        });
    }

    public static verifyCert(caCertPath: string, certPath: string): Q.Promise<{ stdout: string; stderr: string }> {
        return Certs.openSslPromise("verify -CAfile " + caCertPath + " " + certPath);
    }

    private static openSslPromise(args: string): Q.Promise<{ stdout: string; stderr: string }> {
        var deferred = Q.defer<{ stdout: string; stderr: string }>();

        exec("openssl " + args, function (error: Error, stdout: Buffer, stderr: Buffer): void {
            if (Certs.Debug) {
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

    private static certOptionsFromConf(conf: RemoteBuildConf): Certs.ICertOptions {
        var options: Certs.ICertOptions = {};
        if (conf.get("certExpirationdays") < 1) {
            console.info(resources.getString("CertExpirationInvalid", conf.get("certExpirationdays"), Certs.CERT_DEFAULTS.days));
            options.days = Certs.CERT_DEFAULTS.days;
        } else {
            options.days = conf.get("certExpirationdays");
        }

        return options;
    }

    private static writeConfigFile(cnfPath: string, conf: RemoteBuildConf): void {
        var net = os.networkInterfaces();
        var cnf = "[req]\ndistinguished_name = req_distinguished_name\nreq_extensions = v3_req\n[req_distinguished_name]\nC_default = US\n[ v3_req ]\nbasicConstraints = CA:FALSE\nkeyUsage = nonRepudiation, digitalSignature, keyEncipherment\nsubjectAltName = @alt_names\n[alt_names]\n";
        
        var hostname: string = conf.hostname;
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

    private static makeClientPinAndSslCert(caKeyPath: string, caCertPath: string, certsDir: string, options: Certs.ICertOptions, conf: RemoteBuildConf): Q.Promise<number> {
        options = options || {};
        options.cn = Certs.CERT_DEFAULTS.client_cn;
        var clientCertsPath = path.join(certsDir, "client");
        utils.createDirectoryIfNecessary(clientCertsPath);
        // 6 digit random pin (Math.random excludes 1.0)
        var pin = 100000 + Math.floor(Math.random() * 900000);
        var pinDir = path.join(clientCertsPath, "" + pin);
        var pfxPath = path.join(pinDir, "client.pfx");
        var clientKeyPath = path.join(pinDir, "client-key.pem");
        var clientCertPath = path.join(pinDir, "client-cert.pem");

        utils.createDirectoryIfNecessary(pinDir);
        return Certs.makeSelfSignedCert(caKeyPath, caCertPath, clientKeyPath, clientCertPath, options, conf).
            then(function (): Q.Promise<{}> {
            return Certs.makePfx(caCertPath, clientKeyPath, clientCertPath, pfxPath);
            }).
            then(function (): number {
                fs.unlinkSync(clientKeyPath);
                fs.unlinkSync(clientCertPath);
                return pin;
            });
    }

    private static makePfx(caCertPath: string, keyPath: string, certPath: string, outPfxPath: string, options?: Certs.ICertOptions): Q.Promise<{ stdout: string; stderr: string }> {
        options = options || {};
        var name = Certs.CERT_DEFAULTS.pfx_name;
        return Certs.openSslPromise("pkcs12 -export -in " + certPath + " -inkey " + keyPath + " -certfile " + caCertPath + " -out " + outPfxPath +
            " -name \'" + name + "\' -password pass:");
    }

    private static printSetupInstructionsToConsole(conf: RemoteBuildConf, pin: number): void {
        var host = conf.hostname;
        var port = conf.port;
        var pinTimeoutInMinutes = conf.pinTimeout;
        console.info(resources.getString("OSXCertSetupInformation", host, port, pin));
        if (pinTimeoutInMinutes) {
            console.info(resources.getString("OSXCertSetupPinTimeout", pinTimeoutInMinutes));
        } else {
            console.info(resources.getString("OSXCertSetupNoPinTimeout"));
        }

        console.info("remotebuild generateClientCert");
        console.info("");
    }
}

module Certs {
    export interface ICertOptions {
        days?: number;
        cn?: string;
        country?: string;
    };

    export interface ICliHandler {
        question: (question: string, answerCallback: (answer: string) => void) => void;
        close: () => void;
    }
}

export = Certs;
