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

import Commands = require ("./commands");
import RemoteBuildConf = require ("./remoteBuildConf");
import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");

import ICommandData = tacoUtility.Commands.ICommandData;
import HelpCommandBase = tacoUtility.HelpCommandBase;
import Logger = tacoUtility.Logger;

/*
 * Help handles "Taco Help"
 */
class Help extends HelpCommandBase {
    private static CliName: string = "remotebuild";
    private static DefaultCommandData: ICommandData = { options: {}, original: [], remain: [] };

    private remotebuildConf: RemoteBuildConf;

    constructor(remotebuildConf: RemoteBuildConf) {
        super(Help.CliName, path.join(__dirname, "./commands.json"), require("../resources/resourceManager"));
        this.remotebuildConf = remotebuildConf;
    }

    public run(data: ICommandData): Q.Promise<any> {
        var baseRun: any = super.run.bind(this);
        var self: Help = this;

        // for remotebuild help, we always want to show extra comments in the end suggesting users to use 'remotebuild help taco-remote'
        return Q({})
            .then(function (): void {
                var topic: string = data.remain[0];
                if (!topic || Commands.Tasks[topic]) {
                    return baseRun(data);
                }

                var moduleConfig = self.remotebuildConf.moduleConfig(topic);
                if (moduleConfig) {
                    try {
                        var mod: RemoteBuild.IServerModuleFactory = require(moduleConfig.requirePath || topic);
                        mod.printHelp(self.remotebuildConf, moduleConfig);
                    } catch (e) {
                        Logger.logError(resources.getString("UnableToFindModule", topic));
                        baseRun(Help.DefaultCommandData);
                    }
                } else {
                    Logger.logWarning(resources.getString("UnknownCommand", topic));
                    baseRun(Help.DefaultCommandData);
                }
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
