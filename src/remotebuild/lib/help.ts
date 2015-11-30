/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/helpCommandBase.d.ts" />

"use strict";

import path = require ("path");
import Q = require ("q");

import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");

import ICommandData = tacoUtility.Commands.ICommandData;
import HelpCommandBase = tacoUtility.HelpCommandBase;
import Logger = tacoUtility.Logger;

/*
 * Help handles "taco help"
 */
class Help extends HelpCommandBase {
    private static cliName: string = "remotebuild";
    private static defaultCommandData: ICommandData = { options: {}, original: [], remain: [] };

    private remotebuildConf: RemoteBuildConf;

    constructor(remotebuildConf: RemoteBuildConf) {
        super(Help.cliName, path.join(__dirname, "./commands.json"), require("../resources/resourceManager"));
        this.remotebuildConf = remotebuildConf;
    }

    public run(args: string[]): Q.Promise<any> {
        var baseRun: any = super.run.bind(this);
        var self: Help = this;

        // for remotebuild help, we always want to show extra comments in the end suggesting users to use 'remotebuild help taco-remote'
        return Q({})
            .then(function (): Q.Promise<void> {
                var commands: any = require("./commands.json").commands;
                var topic: string = args[0];
                if (!topic || commands[topic]) {
                    return baseRun(args);
                }

                var moduleConfig: RemoteBuild.IServerModuleConfiguration = self.remotebuildConf.moduleConfig(topic);
                if (moduleConfig) {
                    try {
                        var mod: RemoteBuild.IServerModuleFactory = require(moduleConfig.requirePath || topic);
                        mod.printHelp(self.remotebuildConf, moduleConfig);
                    } catch (e) {
                        Logger.logError(resources.getString("UnableToFindModule", topic));
                        return baseRun(Help.defaultCommandData);
                    }
                } else {
                    Logger.logWarning(resources.getString("UnknownCommand", topic));
                    return baseRun(Help.defaultCommandData);
                }

                return Q.resolve<void>(null);
            })
            .then(function (): void {
                if (self.remotebuildConf) {
                    Logger.logLine();
                    Logger.log(resources.getString("RemoteBuildModuleHelpText", self.remotebuildConf.modules.join(", ")));
                }
            });
    }
}

export = Help;
