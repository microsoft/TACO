/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />
/// <reference path="../../../typings/remotebuild.d.ts" />

"use strict";

import child_process = require ("child_process");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import readline = require ("readline");

import tacoUtils = require ("taco-utils");
import resources = tacoUtils.ResourcesManager;
import UtilHelper = tacoUtils.UtilHelper;

class DarwinDependenciesHelper {
    public static askInstallHomebrew(): Q.Promise<any> {
        var firstRunPath = path.join(UtilHelper.tacoHome, ".taco-remote");
        var isFirstRun = !fs.existsSync(firstRunPath);
        var deferred = Q.defer();
        if (isFirstRun) {
            console.info(resources.getString("FirstRunDependencyConfiguration"));
            var readlineInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
            var deferred2 = Q.defer<boolean>();
            readlineInterface.question(resources.getString("HomebrewInstallationQuery"), function (response: string): void {
                var shouldInstall = response === "" || response.trim().toLowerCase().indexOf(resources.getString("HomebrewInstallationQueryResponse")) === 0;

                if (shouldInstall) {
                    DarwinDependenciesHelper.tryInstallHomebrew().then(DarwinDependenciesHelper.tryInstallPackages).then(function (): void {
                        DarwinDependenciesHelper.verifyPackagesInstalled()
                            .then(function (): void {
                            console.info(resources.getString("HomebrewInstallationSuccess"));
                            deferred2.resolve(true);
                        }, function (error: Error): void {
                                console.error(resources.getString("HomebrewPackageVerificationFailed", error));
                                process.exit(1);
                            });
                    }, function (error: Error): void {
                            console.error(resources.getString("HomebrewInstallationFailed", error));
                            process.exit(1);
                        });
                } else {
                    console.info(resources.getString("HomebrewInstallationDeclined"));
                    deferred2.resolve(false);
                }
            });

            deferred2.promise.then(function (shouldInstall: boolean): void {
                child_process.exec("(DevToolsSecurity -enable || true)", function (): void {
                    // Write to the file. We don't read the contents, but it may help with user discoverability if they change their mind
                    UtilHelper.createDirectoryIfNecessary(UtilHelper.tacoHome);
                    fs.writeFileSync(firstRunPath, "installHomebrew = " + (shouldInstall ? "yes" : "no") + "\n");
                    deferred.resolve({});
                });
            });
        } else {
            deferred.resolve({});
        }

        return deferred.promise;
    }

    private static tryInstallHomebrew(): Q.Promise<any> {
        var homebrewInstalled = Q.defer();
        // We use spawn here rather than exec primarily so we can allow for user-interaction
        var curlInstaller = child_process.spawn("curl", ["-fsSL", "https://raw.githubusercontent.com/Homebrew/install/master/install"]);
        var installHomebrew = child_process.spawn("ruby", ["-"]);

        curlInstaller.stdout.on("data", function (data: any): void {
            installHomebrew.stdin.write(data);
        });
        curlInstaller.on("close", function (code: number): void {
            installHomebrew.stdin.end();
        });

        installHomebrew.stdout.on("data", function (data: any): void {
            console.info("" + data);
        });
        installHomebrew.stderr.on("data", function (data: any): void {
            console.error("" + data);
        });
        installHomebrew.on("close", function (code: number): void {
            homebrewInstalled.resolve({});
        });
        installHomebrew.on("error", function (arg: any): void {
            console.error("ERROR: " + JSON.stringify(arg));
            homebrewInstalled.reject(arg);
        });

        return homebrewInstalled.promise;
    }

    private static tryInstallPackages(): Q.Promise<{}> {
        // Install these packages if they do not exist.
        // We need to check first since the install will fail if an older version is already installed.
        // ideviceinstaller and ios-webkit-debug-proxy will install libimobiledevice if required
        return Q.denodeify(child_process.exec)(
            "(brew list ideviceinstaller | grep ideviceinstaller > /dev/null || brew install ideviceinstaller) && " +
            "(brew list ios-webkit-debug-proxy | grep ios-webkit-debug-proxy > /dev/null || brew install ios-webkit-debug-proxy)"
            );
    }

    private static verifyPackagesInstalled(): Q.Promise<{}> {
        // Verify that both of these can run.
        return Q.denodeify(child_process.exec)("ideviceinstaller -h > /dev/null && ios_webkit_debug_proxy -h > /dev/null");
    }
}

export = DarwinDependenciesHelper;