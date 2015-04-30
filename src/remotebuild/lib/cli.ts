/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
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

import HostSpecifics = require ("./hostSpecifics");
import utils = require ("taco-utils");
import server = require ("./server");
import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import UtilHelper = utils.UtilHelper;

function cli(): void {
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
    // TODO
    // resources.init(nconf.get("lang"), path.join(__dirname, "..", "resources"));
    var remotebuildConf = new RemoteBuildConf(nconf);

    if (nconf.get("help") || nconf.get("h") || nconf.get("?") || !nconf.get("serverDir")) {
        HostSpecifics.hostSpecifics.printUsage(nconf.get("lang"));
        process.exit(0);
    }

    var commands = nconf.get("_");
    var command: string = commands && commands.length > 0 ? commands[0] : "start";

    var task = tasks[command];
    if (task) {
        HostSpecifics.hostSpecifics.initialize(remotebuildConf).then(function (): Q.Promise<any> {
            return task.execute(remotebuildConf);
        }).done();
    } else {
        console.info(resources.getString("UnknownCommand"), command);
        HostSpecifics.hostSpecifics.printUsage(nconf.get("lang"));
        process.exit(0);
    }
}

var tasks: { [key: string]: { execute(config: RemoteBuildConf): Q.Promise<any>; } };
tasks = {
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

export = cli;