/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/adm-zip.d.ts"/>
/// <reference path="../../../typings/replace.d.ts" />
/// <reference path="../../../typings/resourceManager.d.ts"/>
/// <reference path="../../../typings/tacoUtils.d.ts"/>
/// <reference path="../../../typings/tacoKits.d.ts"/>
/// <reference path="../../../typings/wrench.d.ts" />

"use strict";

import admZip = require ("adm-zip");
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");
import replace = require ("replace");
import wrench = require ("wrench");

import cordovaHelper = require ("./cordovaHelper");
import cordovaWrapper = require ("./cordovaWrapper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import logger = tacoUtility.Logger;
import utils = tacoUtility.UtilHelper;

module TemplateManager {
    export interface ITemplateDescriptor {
        id: string;
        name: string;
    }

    export interface ITemplateList {
        kitId: string;
        templates: ITemplateDescriptor[];
    }
}

class TemplateManager {
    private static DefaultTemplateId: string = "blank";

    private templateCachePath: string = null;
    private kitHelper: TacoKits.IKitHelper = null;

    constructor(kits: TacoKits.IKitHelper, templateCache?: string) {
        this.kitHelper = kits;
        this.templateCachePath = templateCache || path.join(utils.tacoHome, "templates");
    }

    /**
     * Creates a kit project using 'cordova create' with the specified template.
     *
     * @param {string} The id of the desired kit
     * @param {string} The id of the desired template
     * @param {string} The version of the desired cordova CLI
     * @param {ICordovaCreateParameters} The cordova parameters for the create command
     *
     * @return {Q.Promise<string>} A Q promise that is resolved with the template's display name if there are no errors
     */
    public createKitProjectWithTemplate(kitId: string, templateId: string, cordovaCliVersion: string, cordovaParameters: cordovaHelper.ICordovaCreateParameters): Q.Promise<string> {
        var self = this;
        var templateName: string = null;
        var templateSrcPath: string = null;
      
        templateId = templateId ? templateId : TemplateManager.DefaultTemplateId;
        
        return this.kitHelper.getTemplateOverrideInfo(kitId, templateId)
            .then(function (templateOverrideForKit: TacoKits.ITemplateOverrideInfo): Q.Promise<string> {
                var templateInfo = templateOverrideForKit.templateInfo;

                templateName = templateInfo.name

                return self.findTemplatePath(templateId, templateOverrideForKit.kitId, templateInfo);
            })
            .then(function (templatePath: string): Q.Promise<any> {
                templateSrcPath = templatePath;
                cordovaParameters.copyFrom = templateSrcPath;

                return cordovaWrapper.create(cordovaCliVersion, cordovaParameters);
            })
            .then(function (): Q.Promise<any> {
                var options: any = { clobber: false };

                return utils.copyRecursive(templateSrcPath, cordovaParameters.projectPath, options);
            })
            .then(function (): Q.Promise<any> {
                return TemplateManager.performTokenReplacements(cordovaParameters.projectPath, cordovaParameters.appId, cordovaParameters.appName);
            })
            .then(function (): Q.Promise<string> {
                return Q.resolve(templateName);
            });
    }

    /**
     * Get a list of the available templates for a kit
     *
     * @param {string} The id of the desired kit
     *
     * @return {ITemplateList} An object containing the kitId and its available templates
     */
    public getTemplatesForKit(kitId: string): Q.Promise<TemplateManager.ITemplateList> {
        return this.kitHelper.getTemplatesForKit(kitId)
            .then(function (kitOverride: TacoKits.IKitTemplatesOverrideInfo): Q.Promise<TemplateManager.ITemplateList> {
                var list: TemplateManager.ITemplateList = {
                kitId: kitOverride.kitId,
                templates: []
            };

            for (var i: number = 0; i < kitOverride.templates.length; i++) {
                var templateDescriptor: TemplateManager.ITemplateDescriptor = {
                    id: kitOverride.templates[i].templateId,
                    name: kitOverride.templates[i].templateInfo.name
                };

                list.templates.push(templateDescriptor);
            }

            return Q.resolve(list);
        });
    }

    /**
     * Get the number of entries in the specified template
     *
     * @param {string} kitId The id of the desired kit
     * @param {string} templateId The id of the desired template
     *
     * @return {Q.Promise<number>} A promise resolved with the number of entries in the template
     */
    public getTemplateEntriesCount(kitId: string, templateId: string): Q.Promise<number> {
        return this.kitHelper.getTemplateOverrideInfo(kitId, templateId)
            .then(function (templateOverrideInfo: TacoKits.ITemplateOverrideInfo): number {
                var templateZip = new admZip(templateOverrideInfo.templateInfo.url);

                return templateZip.getEntries().length - 1; // We substract 1, because the returned count includes the root folder of the template
            });
    }

    private static performTokenReplacements(projectPath: string, appId: string, appName: string): Q.Promise<any> {
        var replaceParams: Replace.IReplaceParameters = {
            regex: "",
            replacement: "",
            paths: [path.resolve(projectPath)],
            recursive: true,
            silent: true
        };

        var tokens: { [token: string]: string } = {
            "\\$appid\\$": appId,
            "\\$projectname\\$": appName
        };

        for (var token in tokens) {
            replaceParams.regex = token;
            replaceParams.replacement = tokens[token];

            replace(replaceParams);
        }

        return Q.resolve(null);
    }

    private findTemplatePath(templateId: string, kitId: string, templateInfo: TacoKits.ITemplateInfo): Q.Promise<string> {
        var cachedTemplateKitPath: string = path.join(this.templateCachePath, kitId);
        var cachedTemplatePath: string = path.join(cachedTemplateKitPath, templateId);

        // If the specified template is not in the cache, it means we need to extract it to the cache
        if (!fs.existsSync(cachedTemplatePath)) {
            if (!fs.existsSync(templateInfo.url)) {
                return Q.reject<string>(errorHelper.get(TacoErrorCodes.CommandCreateTemplatesUnavailable));
            }

            // Cache does not contain the specified template, create the directory tree to cache it
            wrench.mkdirSyncRecursive(cachedTemplateKitPath, 511); // 511 decimal is 0777 octal

            // Extract the template archive to the cache
            var templateZip = new admZip(templateInfo.url);

            templateZip.extractAllTo(cachedTemplateKitPath);
        }

        return Q.resolve(cachedTemplatePath);
    }
}

export = TemplateManager;
