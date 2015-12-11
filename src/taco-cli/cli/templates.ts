/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/nopt.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
/// <reference path="../../typings/tacoKits.d.ts" />

"use strict";

import Q = require ("q");

import kitHelper = require ("./utils/kitHelper");
import resources = require ("../resources/resourceManager");
import tacoUtility = require ("taco-utils");
import templateManager = require ("./utils/templateManager");

import commands = tacoUtility.Commands;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;
import telemetryHelper = tacoUtility.TelemetryHelper;

/**
 * Templates
 *
 * Handles "taco templates"
 */
class Templates extends commands.TacoCommandBase {
    public info: commands.ICommandInfo;

    protected runCommand(): Q.Promise<any> {
        var self: Templates = this;

        return this.getTemplatesToPrint()
            .then(function (templateList: templateManager.ITemplateList): void {
                logger.log(resources.getString("CommandTemplatesHeader"));
                logger.logLine();
                LoggerHelper.logNameDescriptionTable(templateList.templates.map(function (value: templateManager.ITemplateDescriptor): INameDescription {
                    return <INameDescription> { name: value.id, description: value.name };
                }));
                logger.logLine();
                logger.log(resources.getString("HowToUseCreateProjectWithTemplate"));
            });
    }
    
    public parseArgs(args: string[]): commands.ICommandData {
        return { options: {}, original: [], remain: [] };
    }

    private getTemplatesToPrint(): Q.Promise<templateManager.ITemplateList> {
        var templates: templateManager = new templateManager(kitHelper);

        return templates.getAllTemplates();
    }
}

export = Templates;
