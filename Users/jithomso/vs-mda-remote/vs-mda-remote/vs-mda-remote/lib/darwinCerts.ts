/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import path = require("path");
import readline = require("readline");
import fs = require("fs");
import Q = require("q");
import os = require("os");
import rimraf = require("rimraf");
import util = require("./util");
import res = require("./resources");
import child_process = require("child_process");
var exec = child_process.exec;

module Certs {
    var verbose = false;
    var CERT_DEFAULTS = {
        DAYS: 1825, // 5 years
        COUNTRY: 'US',
        CA_CN: 'vs-mda-remote-Certificate-Authority',
        PFX_NAME: 'vs-mda-remote-Client-Certificate'
    };

    export interface Conf {
        get(key: string): any
    }

    export function resetServerCert(conf: Conf, yesOrNoHandler?: any) : Q.Promise<any> {
        var certsDir = path.join(conf.get('serverDir'), 'certs');

        if (!fs.existsSync(certsDir)) {
            return initializeServerCerts(conf);
        }

        var shouldProceedDeferred = Q.defer();
        yesOrNoHandler = yesOrNoHandler || readline.createInterface({ input: process.stdin, output: process.stdout });
        var answerCallback = function (answer) {
            answer = answer.toLowerCase();
            if (answer === 'y' || answer === 'yes') {
                yesOrNoHandler.close();
                shouldProceedDeferred.resolve(true);
            } else if (answer === 'n' || answer === 'no') {
                yesOrNoHandler.close();
                shouldProceedDeferred.resolve(false);
            } else {
                yesOrNoHandler.question('Please answer [Y]es or [N]o.' + os.EOL, answerCallback);
            }
        };
        yesOrNoHandler.question('Warning: This command deletes all current client certificates. ' +
            'You will need to generate and configure a new security PIN. Do you want to continue? [Y]es or [N]o' + os.EOL, answerCallback);
        return shouldProceedDeferred.promise.
            then(function (shouldProceed) {
                if (shouldProceed == true) {
                    rimraf.sync(certsDir);
                    return initializeServerCerts(conf);
                }
            });
    };

    export function generateClientCert(conf: Conf) : Q.Promise<number> {
        var certsDir = path.join(conf.get('serverDir'), 'certs');
        var caKeyPath = path.join(certsDir, 'ca-key.pem');
        var caCertPath = path.join(certsDir, 'ca-cert.pem');
        if (!fs.existsSync(caKeyPath) || !fs.existsSync(caCertPath)) {
            var error = res.getString(conf.get("lang"), "CAFilesNotFound", caKeyPath, caCertPath);
            return Q(0).thenReject(error);
        }
        return makeClientPinAndSslCert(caKeyPath, caCertPath, certsDir, certOptionsFromConf(conf), conf).
            then(function (pin) {
                if (util.argToBool(conf.get('suppressVisualStudioMessage'))) {
                    return pin;
                }
                printVisualStudioSetupToConsole(conf, pin);
                return pin;
            });
    };

    export function initializeServerCerts(conf: Conf) : Q.Promise<any>{
        var certsDir = path.join(conf.get('serverDir'), 'certs');
        var certPaths = {
            certsDir: certsDir,
            caKeyPath: path.join(certsDir, 'ca-key.pem'),
            caCertPath: path.join(certsDir, 'ca-cert.pem'),
            serverKeyPath: path.join(certsDir, 'server-key.pem'),
            serverCertPath: path.join(certsDir, 'server-cert.pem'),
            newCerts: false
        };

        var certsExist = fs.existsSync(certPaths.caCertPath) && fs.existsSync(certPaths.serverKeyPath) && fs.existsSync(certPaths.serverCertPath);
        certPaths.newCerts = !certsExist;
        var promise;
        if (certsExist) {
            promise = isExpired(certPaths.caCertPath).
                then(function (hasExpired) {
                    return hasExpired === true || isExpired(certPaths.serverCertPath);
                });
        } else {
            promise = Q(true); // do not exist, so true -> need making
        }

        promise = promise.then(function (shouldMake) {
            if (shouldMake === false) {
                return;
            }
            util.createDirectoryIfNecessary(certsDir);
            var options = certOptionsFromConf(conf);
            return makeSelfSigningCACert(certPaths.caKeyPath, certPaths.caCertPath, options).
                then(function () {
                    return makeSelfSignedCert(certPaths.caKeyPath, certPaths.caCertPath, certPaths.serverKeyPath, certPaths.serverCertPath, options, conf);
                }).
                then(function () {
                    certPaths.newCerts = true;
                });
        }).then(function () {
                return certPaths;
            });
        return promise;
    }


    export function isExpired(certPath: string) : Q.Promise<boolean> {
        return displayCert(certPath, ['dates']).
            then(function (output) {
                var notAfter = new Date(output.stdout.substring(output.stdout.indexOf('notAfter=') + 9, output.stdout.length - 1));
                return (notAfter.getTime() < new Date().getTime());
            });
    };

    // display fields an array of any of these: 'subject', 'issuer', 'dates', etc. (see https://www.openssl.org/docs/apps/x509.html)
    export function displayCert(certPath: string, displayFields: string[]): Q.Promise<{ stdout: string; stderr: string }>{
        //openssl x509 -noout -in selfsigned-cert.pem -subject -issuer -dates
        var args = 'x509 -noout -in ' + certPath;
        (displayFields || []).forEach(function (f) {
            args += ' -' + f;
        });
        return openSslPromise(args);
    };

    export function removeAllCertsSync(conf: Conf): void {
        var certsDir = path.join(conf.get('serverDir'), 'certs');
        if (fs.existsSync(certsDir)) {
            rimraf.sync(certsDir);
        }
    }

    function openSslPromise(args): Q.Promise<{ stdout: string; stderr: string}>{
        var deferred = Q.defer<{ stdout: string; stderr: string}>();

        exec('openssl ' + args, function (error, stdout, stderr) {
            if (verbose) {
                console.info('exec openssl ' + args);
                console.info('stdout: %s', stdout);
                console.info('stderr: %s', stderr);
            }
            if (error !== null) {
                deferred.reject(error);
            } else {
                deferred.resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
            }
        });

        return deferred.promise;
    }

    function certOptionsFromConf(conf) {
        var options: any = {};
        if (conf.get('certExpirationDays') < 1) {
            console.info('certExpirationDays %d would result in expired certs. Default cert expiration %d days will be used instead.', conf.get('certExpirationDays'), CERT_DEFAULTS.DAYS);
        } else {
            options.days = conf.get('certExpirationDays');
        }
        return options;
    }

    // Makes a CA cert that will be used for self-signing our server and client certs.
    function makeSelfSigningCACert(caKeyPath: string, caCertPath: string, options?: any): Q.Promise<{ stdout: string; stderr: string }> {
        options = options || {};
        var days = options.days || CERT_DEFAULTS.DAYS;
        var country = options.country || CERT_DEFAULTS.COUNTRY;
        var cn = options.cn || CERT_DEFAULTS.CA_CN;
        return openSslPromise('req -newkey rsa:4096 -x509 -days ' + days + ' -nodes -subj /C=' + country + '/CN=' + cn + ' -keyout ' + caKeyPath + ' -out ' + caCertPath);
    };

    // Makes a new private key and certificate signed with the CA.
    function makeSelfSignedCert(caKeyPath: string, caCertPath: string, outKeyPath: string, outCertPath: string, options: any, conf: Conf) {
        options = options || {};
        var csrPath = path.join(path.dirname(outCertPath), 'CSR-' + path.basename(outCertPath));
        var days = options.days || CERT_DEFAULTS.DAYS;;
        var cn = options.cn || os.hostname();

        var cnfPath = path.join(conf.get('serverDir'), 'certs', 'openssl.cnf');
        writeConfigFile(cnfPath);

        return openSslPromise('genrsa -out ' + outKeyPath + ' 1024').
            then(function () {
                return openSslPromise('req -new -subj /CN=' + cn + ' -key ' + outKeyPath + ' -out ' + csrPath + ' -config ' + cnfPath);
            }).
            then(function () {
                return openSslPromise('x509 -req -days ' + days + ' -in ' + csrPath + ' -CA ' + caCertPath + ' -CAkey ' + caKeyPath +
                    ' -extensions v3_req -extfile ' + cnfPath + ' -set_serial 01 -out ' + outCertPath);
            }).
            then(function () {
                fs.unlinkSync(csrPath);
            });
    };

    function writeConfigFile(cnfPath: any) : void {
        var net = os.networkInterfaces();
        var cnf = '[req]\ndistinguished_name = req_distinguished_name\nreq_extensions = v3_req\n[req_distinguished_name]\nC_default = US\n[ v3_req ]\nbasicConstraints = CA:FALSE\nkeyUsage = nonRepudiation, digitalSignature, keyEncipherment\nsubjectAltName = @alt_names\n[alt_names]\nDNS.1 = ' + os.hostname() + '\n';
        var count = 1;

        for (var key in net) {
            for (var i = 0; i < net[key].length; i++) {
                if (net[key][i].address && !net[key][i].internal) {
                    cnf += 'IP.' + count + ' = ' + net[key][i].address + '\n';
                    count++;
                }
            }
        }

        fs.writeFileSync(cnfPath, cnf);
    }

    function makeClientPinAndSslCert(caKeyPath: string, caCertPath: string, certsDir: string, options: any, conf: Conf) : Q.Promise<number> {
        options = options || {};
        options.cn = 'vs-mda-remote-client';
        var clientCertsPath = path.join(certsDir, 'client');
        util.createDirectoryIfNecessary(clientCertsPath);
        // 6 digit random pin (Math.random excludes 1.0)
        var pin = 100000 + Math.floor(Math.random() * 900000);
        var pinDir = path.join(clientCertsPath, '' + pin);
        var pfxPath = path.join(pinDir, 'client.pfx');
        var clientKeyPath = path.join(pinDir, 'client-key.pem');
        var clientCertPath = path.join(pinDir, 'client-cert.pem');

        util.createDirectoryIfNecessary(pinDir);
        return makeSelfSignedCert(caKeyPath, caCertPath, clientKeyPath, clientCertPath, options, conf).
            then(function () {
                return makePfx(caCertPath, clientKeyPath, clientCertPath, pfxPath);
            }).
            then(function () {
                fs.unlinkSync(clientKeyPath);
                fs.unlinkSync(clientCertPath);
                return pin;
            });
    }

    function makePfx(caCertPath: string, keyPath: string, certPath: string, outPfxPath: string, options?: any): Q.IPromise<{ stdout: string; stderr: string }> {
        options = options || {};
        var name = options.name || CERT_DEFAULTS.PFX_NAME;
        return openSslPromise('pkcs12 -export -in ' + certPath + ' -inkey ' + keyPath + ' -certfile ' + caCertPath + ' -out ' + outPfxPath +
            ' -name \'' + name + '\' -password pass:');
    }


    // TODO: Make this localizable
    // TODO: Make this explain how to configure vs-mda-client via CLI?
    function printVisualStudioSetupToConsole(conf: Conf, pin: number) {
        var host = conf.get('hostname') || os.hostname();
        var port = conf.get('port');
        var pinTimeoutInMinutes = conf.get('pinTimeout');
        console.info('');
        console.info('First Time Setup');
        console.info('---------------------');
        console.info('Use the following information under Tools, Options, Tools for Apache Cordova, Remote Agent Configuration to configure this agent:');
        console.info('');
        console.info('Enable remote iOS processing: True');
        console.info('Host: %s', host || '<IP address of your Mac>');
        console.info('Port: %s', port || '3000 <or specific port you’ve configured for the agent to use>');
        console.info('Security PIN: %d', pin);
        console.info('');
        if (pinTimeoutInMinutes) {
            console.info('The security PIN is for one-time use and expires in %d minutes. To generate additional PINs, use the following command:', pinTimeoutInMinutes);
        } else {
            console.info('The security PIN is for one-time use. To generate additional PINs, use the following command:');
        }
        console.info('vs-mda-remote generateClientCert');
        console.info('');
    };
}
export = Certs;