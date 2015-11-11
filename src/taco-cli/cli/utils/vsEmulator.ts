/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />
/// <reference path="../../../typings/validator.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts" />

"use strict";

import fs = require("fs");
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

	private static CLIPath = process.env['ProgramFiles(x86)'] + "\\Microsoft Emulator Manager\\1.0\\emulatorcmd.exe";
	private static ListCommand = "\"" + VSEmulator.CLIPath + "\"" + " list /sku:Android /type:device /state:installed";
	private static DetailCommand = "\"" + VSEmulator.CLIPath + "\"" + " detail /sku:Android /type:device /id:";
	private static EmulatorProfileRegex = /(.+)\s\|\s(.+)\s\|\s(.+)/g;
	private static InstalledProfiles: EmulatorProfile[];

	/**
	 * Checks if the VS Emulator is installed on the machine. 
	 */
	public static isInstalled(): Boolean {
		return fs.existsSync(path.resolve(VSEmulator.CLIPath));
	}

	/**
	 * Checks if the emulator is correctly set-up and has installed platforms.
	 */
	public static isReady(): Q.Promise<boolean> {
		if (!VSEmulator.isInstalled) {
			return Q.resolve(false);
		} else {
			return VSEmulator.getInstalledProfiles()
				.then(installedProfiles => { return installedProfiles.length > 0; });
		}
	}

	/**
	 * Gets the emulator installed profiles.
	 * If the profiles have not been parsed yet, it parses and caches them first.
	 */
	public static getInstalledProfiles(): Q.Promise<EmulatorProfile[]> {
		if (VSEmulator.InstalledProfiles) {
			return Q.resolve(VSEmulator.InstalledProfiles);
		} else {
			return VSEmulator.parseInstalledProfiles()
				.then(installedProfiles => { return VSEmulator.InstalledProfiles = installedProfiles; });
		}
	}
	
	/**
	 * Gets additional information about the installed profiles. This information can change, so it is not cached.
	 */
	public static getDetailedProfiles(): Q.Promise<EmulatorDetail[]> {
		return VSEmulator.getInstalledProfiles()
			.then(installedProfiles => Q.all(installedProfiles.map(VSEmulator.GetEmulatorDetailedInfo)));
	}

	/**
	 * Searches for a running instance of the emulator.
	 * The first instance is returned, if any.
	 */
	public static getRunningEmulator(): Q.Promise<EmulatorDetail> {
		return VSEmulator.getDetailedProfiles()
			.then(detailedProfiles => {
				var runningEmulator: EmulatorDetail;
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
		return VSEmulator.executeCommand(VSEmulator.CLIPath, args, { detached: true }, true);
	}

	/**
	 * Gets a running emulator. If there is no emulator running, it launches the first installed profile.
	 */
	public static getOrLaunchEmulator(): Q.Promise<EmulatorDetail> {
		return VSEmulator.getRunningEmulator()
			.then((runningEmulator => {
				if (runningEmulator) {
					return runningEmulator;
				} else {
					return VSEmulator.getInstalledProfiles()
						.then(installedProfiles => {
							return VSEmulator.launchEmulator(installedProfiles[0].key).then(VSEmulator.getRunningEmulator);
						});
				}}));
	}
	
	/**
	 * Gets device detailed information.
	 */
	private static GetEmulatorDetailedInfo(profile: EmulatorProfile): Q.Promise<EmulatorDetail> {
		return VSEmulator.getProcessOutput(VSEmulator.DetailCommand + profile.key)
			.then(detailOutput => {
				var execResult: any[];
				if (execResult = /ADB Serial Number\s+\|\s(\S+)/g.exec(detailOutput)) {
					var detailedInformation: EmulatorDetail = {
						key: profile.key,
						name: profile.name,
						version: profile.version,
						adbSerialNumber: execResult[1],
					};
					return detailedInformation;
				}
				else {
					return profile;
				}
			});
	}
	
	/**
	 * Parses the profiles installed in the emulator manager.
	 */
	private static parseInstalledProfiles(): Q.Promise<EmulatorProfile[]> {
		return VSEmulator.getProcessOutput(VSEmulator.ListCommand)
			.then(listOutput => {
				var execResult: any[];
				var profiles: EmulatorProfile[] = [];

				while (execResult = VSEmulator.EmulatorProfileRegex.exec(listOutput)) {
					if (validator.isUUID(execResult[1]))
						profiles.push({ key: execResult[1], name: execResult[2], version: execResult[3] });
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
            stderr && Logger.logError("" + stderr);

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
	 * Executes a command and logs its output to the console.
	 */
	private static executeCommand(command: string, args?: string[], options?: any, unref?: boolean): Q.Promise<number> {
		var deferred = Q.defer<number>();
		var process = child_process.spawn(command, args, options);

		process.stdout.on('data', function(data: string) {
			Logger.log("" + data);
		});

		process.stderr.on('data', function(data: string) {
			Logger.logError("" + data);
		});

		process.on('exit', function(code: number) {
			deferred.resolve(code);
		});

		if (unref) {
			(<any>process).unref();
		}

		return deferred.promise;
	};
}

/**
 * Defines an installed emulator profile.
 */
export interface EmulatorProfile {
	key: string;
	name: string;
	version: string;
}

/**
 * Defines additional details about an emulator profile.
 * This data is available by invoking the detail command.
 */
export interface EmulatorDetail extends EmulatorProfile {
	adbSerialNumber?: string;
}
