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
/// <reference path="../../typings/taco-utils.d.ts" />
"use strict";

import fs = require ("fs");
import nconf = require ("nconf");
import path = require ("path");
import Q = require ("q");

import HostSpecifics = require ("./host-specifics");
import utils = require ("taco-utils");
import server = require ("./server");

import resources = utils.ResourcesManager;
import UtilHelper = utils.UtilHelper;

function cli(): void {
    console.info("taco-remote");
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
        // Default to using TACO_HOME/TacoRemote.config
        // If that file doesn't exist, then this will be equivalent to nconf.use("memory") as long as we don't try to save it out
        nconf.file({ file: path.join(UtilHelper.tacoHome, "TacoRemote.config")});
    };
    var defaults: any = {
        port: 3000,
        secure: true,
        pinTimeout: 10
    };

    defaults = HostSpecifics.hostSpecifics.defaults(defaults);
    nconf.defaults(defaults);
    // Initialize localization resources
    resources.init(nconf.get("lang"), path.join(__dirname, "..", "resources"));

    if (nconf.get("help") || nconf.get("h") || nconf.get("?") || !nconf.get("serverDir")) {
        HostSpecifics.hostSpecifics.printUsage(nconf.get("lang"));
        process.exit(0);
    }

    var commands = nconf.get("_");
    var command: string = commands && commands.length > 0 ? commands[0] : "start";

    var task = tasks[command];
    if (task) {
        HostSpecifics.hostSpecifics.initialize(nconf).then(task.execute).done();
    } else {
        console.info(resources.getStringForLanguage(nconf.get("lang"), "UnknownCommand"), command);
        HostSpecifics.hostSpecifics.printUsage(nconf.get("lang"));
        process.exit(0);
    }
}

var tasks: { [key: string]: { execute(): Q.IPromise<any>; } };
tasks = {
    start: {
        execute: function (): Q.Promise<void> {
            return server.start(nconf);
        }
    },
    resetServerCert: {
        execute: function (): Q.Promise<void> {
            return server.resetServerCert(nconf);
        }
    },
    generateClientCert: {
        execute: function (): Q.Promise<void> {
            return server.generateClientCert(nconf);
        }
    }
};

export = cli;