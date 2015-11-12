/**
  *******************************************************
  *                                                     *
  *   Copyright (C) Microsoft. All rights reserved.     *
  *                                                     *
  *******************************************************
  */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/validator.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />

"use strict";

import fs = require("fs");
import os = require("os");
import path = require("path");
import child_process = require("child_process");
import Q = require("q");
import validator = require("validator");
import resources = require("../../resources/resourceManager");
import utils = require("taco-utils");
import Logger = utils.Logger;

/**
 * Handles the Visual Studio Emulator for Android specific operations.
 */
export class VSEmulator {

    private static CLI_PATH: string = process.env["ProgramFiles(x86)"] + "\\Microsoft Emulator Manager\\1.0\\emulatorcmd.exe";
    private static LIST_COMMAND: string = "\"" + VSEmulator.CLI_PATH + "\"" + " list /sku:Android /type:device /state:installed";
    private static DETAIL_COMMAND: string = "\"" + VSEmulator.CLI_PATH + "\"" + " detail /sku:Android /type:device /id:";
    private static EMULATOR_PROFILE_REGEX: RegExp = /(.+)\s\|\s(.+)\s\|\s(.+)/g;
    private static LOG_FILE: string = "VSAndroidEmulator.log";
    private static INSTALLED_PROFILES: IEmulatorProfile[];

    /**
     * Checks if the VS Emulator is installed on the machine. 
     */
    public static isInstalled(): Boolean {
        return fs.existsSync(path.resolve(VSEmulator.CLI_PATH));
    }

    /**
     * Checks if the emulator is correctly set-up and has installed platforms.
     */
    public static isReady(): Q.Promise<boolean> {
        if (!VSEmulator.isInstalled) {
            return Q.resolve(false);
        } else {
            return VSEmulator.getInstalledProfiles()
                .then((installedProfiles: IEmulatorProfile[]) => { return installedProfiles.length > 0; });
        }
    }

    /**
     * Gets the emulator installed profiles.
     * If the profiles have not been parsed yet, it parses and caches them first.
     */
    public static getInstalledProfiles(): Q.Promise<IEmulatorProfile[]> {
        if (VSEmulator.INSTALLED_PROFILES) {
            return Q.resolve(VSEmulator.INSTALLED_PROFILES);
        } else {
            return VSEmulator.parseInstalledProfiles()
                .then((installedProfiles: IEmulatorProfile[]) => { return VSEmulator.INSTALLED_PROFILES = installedProfiles; });
        }
    }

    /**
     * Gets additional information about the installed profiles. This information can change, so it is not cached.
     */
    public static getDetailedProfiles(): Q.Promise<IEmulatorDetail[]> {
        return VSEmulator.getInstalledProfiles()
            .then((installedProfiles: IEmulatorDetail[]) => Q.all(installedProfiles.map(VSEmulator.GetEmulatorDetailedInfo)));
    }

    /**
     * Searches for a running instance of the emulator.
     * The first instance is returned, if any.
     */
    public static getRunningEmulator(): Q.Promise<IEmulatorDetail> {
        return VSEmulator.getDetailedProfiles()
            .then((detailedProfiles: IEmulatorDetail[]) => {
                var runningEmulator: IEmulatorDetail;
                for (var i = 0; i < detailedProfiles.length; i++) {
                    /* if adb sees the emulator, it is running */
                    if (detailedProfiles[i].adbSerialNumber) {
                        runningEmulator = detailedProfiles[i];
                        break;
                    }
                }

                return runningEmulator;
            });
    }

    /**
     * Launches an emulator image if it is not already running.
     */
    public static launchEmulator(id: String): Q.Promise<number> {
        var args = ["launch", "/sku:Android", "/id:" + id];
        return VSEmulator.executeCommand(VSEmulator.CLI_PATH, args, true);
    }

    /**
     * Gets a running emulator. If there is no emulator running, it launches the first installed profile.
     */
    public static getOrLaunchEmulator(): Q.Promise<IEmulatorDetail> {
        return VSEmulator.getRunningEmulator()
            .then((runningEmulator: IEmulatorDetail) => {
                if (runningEmulator) {
                    return runningEmulator;
                } else {
                    return VSEmulator.getInstalledProfiles()
                        .then((installedProfiles: IEmulatorProfile[]) => {
                            return VSEmulator.launchEmulator(installedProfiles[0].key).then(VSEmulator.getRunningEmulator);
                        });
                }
            });
    }

    /**
     * Gets device detailed information.
     */
    private static GetEmulatorDetailedInfo(profile: IEmulatorProfile): Q.Promise<IEmulatorDetail> {
        return VSEmulator.getProcessOutput(VSEmulator.DETAIL_COMMAND + profile.key)
            .then((detailOutput: string) => {
                var execResult: any[] = /ADB Serial Number\s+\|\s(\S+)/g.exec(detailOutput);
                if (execResult) {
                    var detailedInformation: IEmulatorDetail = {
                        key: profile.key,
                        name: profile.name,
                        version: profile.version,
                        adbSerialNumber: execResult[1]
                    };
                    return detailedInformation;
                } else {
                    return profile;
                }
            });
    }

    /**
     * Parses the profiles installed in the emulator manager.
     */
    private static parseInstalledProfiles(): Q.Promise<IEmulatorProfile[]> {
        return VSEmulator.getProcessOutput(VSEmulator.LIST_COMMAND)
            .then((listOutput: string) => {
                var profiles: IEmulatorProfile[] = [];
                var execResult: any[] = VSEmulator.EMULATOR_PROFILE_REGEX.exec(listOutput);
                while (execResult) {
                    if (validator.isUUID(execResult[1])) {
                        profiles.push({ key: execResult[1], name: execResult[2], version: execResult[3] });
                    }
                    execResult = VSEmulator.EMULATOR_PROFILE_REGEX.exec(listOutput);
                }
                return profiles;
            });
    }

    /**
     * Executes a child process returns its output as a string.
     */
    private static getProcessOutput(command: string, options?: child_process.IExecOptions): Q.Promise<string> {
        var deferred = Q.defer<string>();
        var result = "";

        options = options || {};
        options.maxBuffer = 1024 * 500;

        child_process.exec(command, options, (error: Error, stdout: Buffer, stderr: Buffer) => {

            result += stdout;

            if (stderr) {
                Logger.logError("" + stderr);
            }

            if (error) {
                Logger.logError("" + error);
                deferred.reject(error);
            } else {
                deferred.resolve(result);
            }
        });

        return deferred.promise;
    }

    /**
     * Spawns a new process by executing a command.
     */
    private static executeCommand(command: string, args?: string[], detached?: boolean): Q.Promise<number> {
        var deferred = Q.defer<number>();
        var options: any;

        if (detached) {
            var emulatorLogPath = path.join(os.tmpdir(), VSEmulator.LOG_FILE);
            var out = fs.openSync(emulatorLogPath, "a");
            var err = fs.openSync(emulatorLogPath, "a");
            options = {
                detached: true,
                stdio: ["ignore", out, err]
            };
        }

        var process = child_process.spawn(command, args, options);

        process.on("exit", function (code: number): void {
            if (detached) {
                (<any> process).unref();
            }
            deferred.resolve(code);
        });

        return deferred.promise;
    }
}

/**
 * Defines an installed emulator profile.
 */
export interface IEmulatorProfile {
    key: string;
    name: string;
    version: string;
}

/**
 * Defines additional details about an emulator profile.
 * This data is available by invoking the detail command.
 */
export interface IEmulatorDetail extends IEmulatorProfile {
    adbSerialNumber?: string;
}
