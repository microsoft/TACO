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
import installLogLevel = require("./installLogLevel");
import Q = require("q");

import InstallLogLevel = installLogLevel.InstallLogLevel;

module TacoUtility {
	export class NpmHelper {
		private static runNpmCommand(npmCommand: string, path: string, args: string[], optionalArgs: any, logLevel?: InstallLogLevel): Q.Promise<any> {
			return Q.nfcall(npm.load, {}).then(function() {
				if (npm.config.list[0]) {
					npm.config.list[0]["logLevel"] = InstallLogLevel[logLevel];
				}
				npm.prefix = path;
				
				if (optionalArgs !== undefined) {
					return Q.ninvoke(npm.commands, npmCommand, args, optionalArgs);
				}
				else {
					return Q.ninvoke(npm.commands, npmCommand, args);
				}
			});
		}
		
		public static install(args: string[], path: string, logLevel?: InstallLogLevel): Q.Promise<any> {
			return NpmHelper.runNpmCommand("install", path, args, undefined, logLevel);
		}
		
		public static view(args: string[], path: string, logLevel?: InstallLogLevel): Q.Promise<any> {
			return NpmHelper.runNpmCommand("view", path, args, true, logLevel);
		}
	}
}

export = TacoUtility;
