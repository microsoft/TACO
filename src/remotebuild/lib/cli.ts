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

import fs = require ("fs");
import nconf = require ("nconf");
import path = require ("path");
import Q = require ("q");
import util = require ("util");

import HostSpecifics = require ("./hostSpecifics");
import RemoteBuildConf = require ("./remoteBuildConf");
import server = require ("./server");
import utils = require ("taco-utils");

import JSDocHelpPrinter = utils.JSDocHelpPrinter;
import Logger = utils.Logger;
import UtilHelper = utils.UtilHelper;

var resources: utils.ResourceManager = null;

class CliHelper {
    private static Tasks: { [key: string]: { execute(config: RemoteBuildConf): Q.Promise<any>; } } = {
        start: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.start(config);
            }
        },
        test: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.test(config);
            }
        },
        resetServerCert: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.resetServerCert(config);
            }
        },
        generateClientCert: {
            execute: function (config: RemoteBuildConf): Q.Promise<void> {
                return server.generateClientCert(config);
            }
        }
    };

    public static cli(): void {
        console.info("remotebuild");
        console.info("Copyright (C) 2014 Microsoft Corporation. All rights reserved.");
        console.info(require("../package").version);
        console.info("");

        // Configuration preference: command line, then anything in a config file if specified by the --config arg, then some defaults for options not yet set
        nconf.argv();
        if (nconf.get("v") || nconf.get("version")) {
            process.exit(0);
        }

        if (nconf.get("config")) {
            nconf.file({ file: nconf.get("config") });
        } else {
            // Default to using TACO_HOME/RemoteBuild.config
            // If that file doesn't exist, then this will be equivalent to nconf.use("memory") as long as we don't try to save it out
            nconf.file({ file: path.join(UtilHelper.tacoHome, "RemoteBuild.config") });
        };
    
        // Initialize localization resources
        resources = new utils.ResourceManager(path.join(__dirname, "..", "resources"));
        var remotebuildConf = new RemoteBuildConf(nconf);

        var commands = nconf.get("_");
        var command: string = commands && commands.length > 0 ? commands[0] : "start";

        if (nconf.get("help") || nconf.get("h") || command === "help" || !remotebuildConf.serverDir) {
            // If the user does "remotebuild --help foo" then we should give help for "foo".
            // Similarly if they do "remotebuild help foo"
            // If they do remotebuild help foo --help bar then we'll go with bar
            var topic: string = nconf.get("help") || nconf.get("h") || commands[1];
            CliHelper.printHelp(remotebuildConf, topic);
            process.exit(0);
        }

        var task = CliHelper.Tasks[command];
        if (task) {
            HostSpecifics.hostSpecifics.initialize(remotebuildConf).then(function (): Q.Promise<any> {
                return task.execute(remotebuildConf);
            }).done();
        } else {
            Logger.logErrorLine(resources.getString("UnknownCommand", command));
            CliHelper.printHelp(remotebuildConf);
            process.exit(1);
        }
    }
    
    private static printHelp(conf: RemoteBuildConf, topic?: string): void {
        if (topic) {
            var moduleConfig = conf.moduleConfig(topic);
            if (moduleConfig) {
                try {
                    var mod: RemoteBuild.IServerModuleFactory = require(moduleConfig.requirePath || topic);
                    mod.printHelp(conf, moduleConfig);
                    return;
                } catch (e) {
                    Logger.logErrorLine(resources.getString("UnableToFindModule", topic));
                }
            } else {
                Logger.logErrorLine(resources.getString("UnableToFindModule", topic));
            }
        }

        console.info(resources.getString("UsageInformation1"));

        var helpPrinter = new JSDocHelpPrinter(require.resolve("./remoteBuildConf.jsdoc.json"), resources);
        helpPrinter.printHelp("  --");

        console.info(resources.getString("UsageInformation2", conf.modules.join(", ")));
    }
}

var cli = CliHelper.cli;
export = cli;
