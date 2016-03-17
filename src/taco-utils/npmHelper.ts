// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

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
                var configList = npm.config.list[0];

                propertiesToSet.forEach(prop => {
                    oldValues[prop] = configList[prop];
                    configList[prop] = conf[prop];
                });

                npm.prefix = workingDirectory || ".";

                if (optionalArgs !== undefined) {
                    return Q.ninvoke(npm.commands, npmCommand, args, optionalArgs);
                }

                return Q.ninvoke(npm.commands, npmCommand, args);
            })
            .finally(function(){
                var configList = npm.config.list[0];

                propertiesToSet.forEach(prop => {
                    if (oldValues[prop] !== undefined) {
                        configList[prop] = oldValues[prop];
                    } else {
                        delete configList[prop];
                    }
                });
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
