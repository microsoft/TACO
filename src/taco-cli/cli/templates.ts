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

import resources = require ("../resources/resourceManager");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");
import templateManager = require ("./utils/templateManager");

import commands = tacoUtility.Commands;
import kitHelper = tacoKits.KitHelper;
import logger = tacoUtility.Logger;
import LoggerHelper = tacoUtility.LoggerHelper;

/*
 * Templates
 *
 * Handles "taco templates"
 */
class Templates implements commands.IDocumentedCommand {
    private static KnownOptions: Nopt.FlagTypeMap = {
        kit: String
    };

    private useKit: boolean;
    private kitId: string;

    public info: commands.ICommandInfo;

    public run(data: commands.ICommandData): Q.Promise<any> {
        var self = this;
        var commandData: commands.ICommandData = tacoUtility.ArgsHelper.parseArguments(Templates.KnownOptions, {}, data.original, 0);

        this.useKit = commandData.options.hasOwnProperty("kit");
        this.kitId = commandData.options["kit"];

        return this.getTemplatesToPrint()
            .then(function (templateList: templateManager.ITemplateList): void {
                logger.logLine();

                if (self.useKit) {
                    var kitToPrint: string = self.kitId || templateList.kitId;

                    logger.log(resources.getString("CommandTemplatesHeaderKit", kitToPrint));
                } else {
                    logger.log(resources.getString("CommandTemplatesHeader"));
                }

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

        if (this.useKit) {
            return templates.getTemplatesForKit(this.kitId);
        }

        return templates.getAllTemplates();
    }
}

export = Templates;