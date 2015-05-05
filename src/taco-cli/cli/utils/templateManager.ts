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
import tacoUtility = require ("taco-utils");

import logger = tacoUtility.Logger;
import utils = tacoUtility.UtilHelper;

module TemplateManager {
    export interface IKitHelper {
        getTemplateOverrideInfo: (kitId: string, templateId: string) => Q.Promise<TacoKits.ITemplateOverrideInfo>;
        getTemplatesForKit(kitId: string): Q.Promise<TacoKits.IKitTemplatesOverrideInfo>;
    }

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
    private kitHelper: TemplateManager.IKitHelper = null;

    /**
     * Returns the best localized name to use for the specified template.
     */
    private static getLocalizedTemplateName(templateInfo: TacoKits.ITemplateInfo): string {
        // Get the best language to use from the available localizations in the template's name
        var availableLanguages: string[] = [];

        for (var language in templateInfo.name) {
            if (templateInfo.name.hasOwnProperty(language)) {
                availableLanguages.push(language);
            }
        }

        var useLanguage: string = tacoUtility.ResourceManager.getBestAvailableLocale(availableLanguages);

        return templateInfo.name[useLanguage];
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

    public constructor(kits: TemplateManager.IKitHelper, templateCache?: string) {
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
    public createKitProjectWithTemplate(kitId: string, templateId: string, cordovaCli: string, cordovaParameters: cordovaHelper.ICordovaCreateParameters): Q.Promise<string> {
        var self = this;
        var templateName: string = null;
        var templateSrcPath: string = null;
      
        templateId = templateId ? templateId : TemplateManager.DefaultTemplateId;
        
        return this.kitHelper.getTemplateOverrideInfo(kitId, templateId)
            .then(function (templateOverrideForKit: TacoKits.ITemplateOverrideInfo): Q.Promise<string> {
                var templateInfo = templateOverrideForKit.templateInfo;

                templateName = TemplateManager.getLocalizedTemplateName(templateInfo);

                return self.findTemplatePath(templateId, templateOverrideForKit.kitId, templateInfo);
            })
            .then(function (templatePath: string): Q.Promise<any> {
                templateSrcPath = templatePath;
                cordovaParameters.copyFrom = templateSrcPath;

                return cordovaWrapper.create(cordovaCli, cordovaParameters);
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
                    name: TemplateManager.getLocalizedTemplateName(kitOverride.templates[i].templateInfo)
                };

                list.templates.push(templateDescriptor);
            }

            return Q.resolve(list);
        });
    }

    private findTemplatePath(templateId: string, kitId: string, templateInfo: TacoKits.ITemplateInfo): Q.Promise<string> {
        var cachedTemplateKitPath: string = path.join(this.templateCachePath, kitId);
        var cachedTemplatePath: string = path.join(cachedTemplateKitPath, templateId);

        // If the specified template is not in the cache, it means we need to extract it to the cache
        if (!fs.existsSync(cachedTemplatePath)) {
            if (!fs.existsSync(templateInfo.url)) {
                logger.logErrorLine(resources.getString("command.create.templatesUnavailable"));

                return Q.reject<string>("command.create.templatesUnavailable");
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