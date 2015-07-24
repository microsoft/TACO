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

/*
 * Templates
 *
 * Handles "taco templates"
 */
class Templates implements commands.IDocumentedCommand {
    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var self = this;

        return this.getTemplatesToPrint()
            .then(function (templateList: templateManager.ITemplateList): void {
                logger.logLine();
                logger.log(resources.getString("CommandTemplatesHeader"));
                logger.logLine();
                LoggerHelper.logNameDescriptionTable(templateList.templates.map(function (value: templateManager.ITemplateDescriptor): INameDescription {
                    return <INameDescription>{ name: value.id, description: value.name };
                }));
                logger.logLine();
            });
    }

    /**
     * specific handling for whether this command can handle the args given, otherwise falls through to Cordova CLI
     */
    public canHandleArgs(data: commands.ICommandData): boolean {
        return true;
    }

    private getTemplatesToPrint(): Q.Promise<templateManager.ITemplateList> {
        var templates: templateManager = new templateManager(kitHelper);

        return templates.getAllTemplates();
    }
}

export = Templates;