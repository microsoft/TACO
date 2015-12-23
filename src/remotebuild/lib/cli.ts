/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/Q.d.ts" />
/// <reference path="../../typings/nconf.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />

"use strict";

import nconf = require ("nconf");
import path = require ("path");
import Q = require ("q");

import Commands = require ("./commands");
import Help = require ("./help");
import hostSpecifics = require ("./hostSpecifics");
import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import utils = require ("taco-utils");
import telemetry = utils.Telemetry;

import HostSpecifics = hostSpecifics.hostSpecifics;
import Logger = utils.Logger;

import UtilHelper = utils.UtilHelper;

class CliHelper {
    public static cli(): void {
        var args: string[] = process.argv.slice(2);
        var remotebuildConf: RemoteBuildConf = null;

        Q({})
            .then(function (): void {
                // if version flag found, show version and exit
                CliHelper.handleVersionFlag(args);
            })
            .then(function(): Q.Promise<any> {
                return telemetry.init("REMOTEBUILD", require("../package.json").version, {settingsFileName: "RemotebuildTelemetrySettings.json"});
            })
            .then(function (): Q.Promise<void> {
                remotebuildConf = CliHelper.parseRemoteBuildConf();
                // if help flag is found, show help and exit
                return CliHelper.handleHelpFlag(args, remotebuildConf);
            })
            .then(function (): Q.Promise<void> {
                var command: string = nconf.get("_")[0] || "start";
                var task: RemoteBuild.IRemoteBuildTask = Commands.tasks[command];

                if (!task) {
                    Logger.logError(resources.getString("UnknownCommand", command));
                    return CliHelper.printHelp(remotebuildConf)
                        .then(function (): void {
                            process.exit(0);
                        });
                }

                return HostSpecifics.initialize(remotebuildConf)
                       .then(function (): Q.Promise<any> {
                              return task.execute(remotebuildConf, args);
                       });
            })
            .done();
    }

    private static parseRemoteBuildConf(): RemoteBuildConf {
        // Configuration preference: command line, then anything in a config file if specified by the --config arg, then some defaults for options not yet set
        nconf.argv();
        // Default to using TACO_HOME/RemoteBuild.config
        // If that file doesn't exist, then this will be equivalent to nconf.use("memory") as long as we don't try to save it out
        var configFile: string = nconf.get("config") || path.join(UtilHelper.tacoHome, "RemoteBuild.config");
        nconf.file({ file: configFile });

        return new RemoteBuildConf(nconf);
    }

    private static handleVersionFlag(args: string[]): void {
        if (UtilHelper.tryParseVersionArgs(args)) {
            Logger.log("Copyright (C) 2014-2015 Microsoft Corporation. All rights reserved.");
            Logger.log(require("../package").version);
            Logger.logLine();
            process.exit(0);
        }
    }

    private static handleHelpFlag(args: string[], remotebuildConf: RemoteBuildConf): Q.Promise<void> {
        var helpArgs: ITacoHelpArgs = UtilHelper.tryParseHelpArgs(args);
        if (helpArgs) {
            return CliHelper.printHelp(remotebuildConf, helpArgs.helpTopic)
            .then(function (): void {
                process.exit(0);
            });
        }

        return Q.resolve<void>(null);
    }

    private static printHelp(remotebuildConf: RemoteBuildConf, topic?: string): Q.Promise<void> {
        var help: Help = new Help(remotebuildConf);
        return help.run([topic]);
    }
}

var cli: () => void = CliHelper.cli;
export = cli;
