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

import Commands = require ("./commands");
import Help = require ("./help");
import HostSpecifics = require ("./hostSpecifics");
import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import utils = require ("taco-utils");

import Logger = utils.Logger;
import UtilHelper = utils.UtilHelper;

class CliHelper {
    public static cli(): void {
        var args: string[] = process.argv.slice(2);

        // if version flag found, show version and exit
        CliHelper.handleVersionFlag(args);

        var remotebuildConf: RemoteBuildConf = CliHelper.parseRemoteBuildConf();

        // if help flag is found, show help and exit
        CliHelper.handleHelpFlag(args, remotebuildConf);

        var command: string = args[0] || "start";
        var task = Commands.Tasks[command];

        if (!task) {
            Logger.logError(resources.getString("UnknownCommand", command));
            CliHelper.printHelp(remotebuildConf);
            process.exit(1);
        }

        HostSpecifics.hostSpecifics.initialize(remotebuildConf)
            .then(function (): Q.Promise<any> {
                return task.execute(remotebuildConf);
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
            console.info("remotebuild");
            console.info("Copyright (C) 2014 Microsoft Corporation. All rights reserved.");
            console.info(require("../package").version);
            console.info("");
            process.exit(0);
        }
    }

    private static handleHelpFlag(args: string[], remotebuildConf: RemoteBuildConf): void {
        var helpArgs: ITacoHelpArgs = UtilHelper.tryParseHelpArgs(args);
        if (helpArgs) {
            CliHelper.printHelp(remotebuildConf, helpArgs.helpTopic);
        }
    }

    private static printHelp(remotebuildConf: RemoteBuildConf, topic?: string): void {
        var help: Help = new Help(remotebuildConf);
        help.run({ options: {}, original: [topic], remain: [topic] }).done(function (): void {
            process.exit(0);
        });
    }
}

var cli = CliHelper.cli;
export = cli;
