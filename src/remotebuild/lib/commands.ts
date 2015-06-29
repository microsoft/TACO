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
import Q = require ("q");

import Help = require ("./help");
import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import server = require ("./server");
import utils = require ("taco-utils");

import Logger = utils.Logger;
interface IRemoteBuildTask {
    execute(config: RemoteBuildConf, subCommand?: string): Q.Promise<any>;
}

class Commands {
    public static Tasks: { [key: string]: IRemoteBuildTask } = {
        start: {
            execute: function (config: RemoteBuildConf, subCommand: string): Q.Promise<void> {
                return server.start(config);
            },
        },
        test: {
            execute: function (config: RemoteBuildConf, subCommand: string): Q.Promise<void> {
                return server.test(config);
            }
        },
        certificates: {
            execute: function (config: RemoteBuildConf, subCommand: string): Q.Promise<void> {
                switch (subCommand) {
                    case "generate":
                        return server.generateClientCert(config);
                    case "reset":
                        return server.resetServerCert(config);
                    default:
                }

                Logger.logError(resources.getString("UnknownCommand", subCommand));
                var topic: string = "certificates";
                var help: Help = new Help(config);
                return help.run({ options: {}, original: [topic], remain: [topic] });
            }
        },
        help: {
            execute: function (config: RemoteBuildConf, subCommand: string): Q.Promise<void> {
                return Q.resolve<void>(null);
            }
        },
        version: {
            execute: function (config: RemoteBuildConf, subCommand: string): Q.Promise<void> {
                return Q.resolve<void>(null);
            }
        }
    };
}

export = Commands;
