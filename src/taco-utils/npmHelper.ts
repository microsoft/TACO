/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/npm.d.ts" />
/// <reference path="../typings/q.d.ts" />

"use strict";

import npm = require("npm");
import path = require("path");
import Q = require("q");
import nopt = require("nopt");
import url = require("url");
import semver = require("semver");

var npmconf = require("npm/lib/config/core.js");
var configDefs = npmconf.defs;
var types = configDefs.types;
var shorthands = configDefs.shorthands;

import installLogLevel = require("./installLogLevel");
import InstallLogLevel = installLogLevel.InstallLogLevel;

module TacoUtility {
	export class NpmHelper {
		private static runNpmCommand(npmCommand: string, args: string[], workingDirectory: string, commandFlags?: string[], logLevel?: InstallLogLevel, optionalArgs?: any): Q.Promise<any> {
			var conf: any = {};
			if (commandFlags) {
				conf = nopt(types, shorthands, commandFlags, 0);
			}
			
			if (logLevel && logLevel > 0) {
				conf["logLevel"] = InstallLogLevel[logLevel];
			}
			
			var propertiesToSet: string[] = Object.keys(conf);
			if (propertiesToSet.indexOf("argv") !== -1) {
				propertiesToSet.splice(propertiesToSet.indexOf("argv"), 1);
			}
			
			var oldValues: any = {};
			return Q.nfcall(npm.load, {}).then(function() {
				for (var i: number = 0; i < propertiesToSet.length; i++) {
					// Record current value
					oldValues[propertiesToSet[i]] = Object.keys(npm.config.list[0]).indexOf(propertiesToSet[i]) === -1 ? undefined : npm.config.list[0][propertiesToSet[i]];
					// Set new value from config object
					npm.config.list[0][propertiesToSet[i]] = conf[propertiesToSet[i]];
				}

				npm.prefix = workingDirectory || ".";

				if (optionalArgs !== undefined) {
					return Q.ninvoke(npm.commands, npmCommand, args, optionalArgs);
				}
				else {
					return Q.ninvoke(npm.commands, npmCommand, args);
				}
			})
			.finally(function(){
				for (var i: number = 0; i < propertiesToSet.length; i++) {
					// Restore previous value
					npm.config.list[0][propertiesToSet[i]] = oldValues[propertiesToSet[i]];

					// Delete property if previous value was undefined
					if (npm.config.list[0][propertiesToSet[i]] === undefined) {
						delete npm.config.list[0][propertiesToSet[i]];
					}
				}
			});
		}
		
		public static install(packageId: string, workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any> {
			return NpmHelper.runNpmCommand("install", [packageId], workingDirectory, commandFlags, logLevel);
		}
		
		public static view(packageId: string, fields?: string[], workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any> {
			var args = [packageId].concat(fields);
			return NpmHelper.runNpmCommand("view", args, workingDirectory, commandFlags, logLevel, /*silent=*/true);
		}
	}
}

export = TacoUtility;
