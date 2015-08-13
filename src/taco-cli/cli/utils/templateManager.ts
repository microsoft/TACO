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
import childProcess = require ("child_process");
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
        getDescription(): string;
    }

    export interface ITemplateList {
        kitId: string;
        templates: ITemplateDescriptor[];
    }
}

class TemplateDescriptor implements TemplateManager.ITemplateDescriptor {
    public id: string;
    public name: string;

    constructor(templateOverrideInfo: TacoKits.ITemplateOverrideInfo) {
        this.id = templateOverrideInfo.templateId;
        this.name = templateOverrideInfo.templateInfo.name;
    }

    public getDescription(): string {
        return resources.getString(this.name);
    }
}

class TemplateManager {
    private static DefaultTemplateId: string = "blank";
    private static TemplatesFolderName: string = "templates";
    private static GitTemplatesFolderName: string = "git-templates";

    private templateCachePath: string = null;
    private kitHelper: TacoKits.IKitHelper = null;
    private templateName: string = null;

    constructor(kits: TacoKits.IKitHelper, templateCache?: string) {
        this.kitHelper = kits;
        this.templateCachePath = templateCache || path.join(utils.tacoHome, TemplateManager.TemplatesFolderName);
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
    public createKitProjectWithTemplate(kitId: string, templateId: string, cordovaCliVersion: string, cordovaParameters: Cordova.ICordovaCreateParameters): Q.Promise<string> {
        var self = this;
        var templateSrcPath: string = null;

        // Check if a git template was requested
        // TODO
        dsd

        templateId = templateId ? templateId : TemplateManager.DefaultTemplateId;

        // Have a AcquireTemplate() method that either gets the template from the kit metadata + cache it, or gets the template from github
        // TODO
        dsads
        
            .then(function (templatePath: string): Q.Promise<any> {
                // At this point we are back to common behavior for kit templates and github templates
                // TODO
                dsadsa
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
                return Q.resolve(self.templateName);
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
                return Q.resolve({
                    kitId: kitOverride.kitId,
                    templates: kitOverride.templates.map(t => new TemplateDescriptor(t))
            });
        });
    }

    /**
     * Get a list of all available templates
     *
     * @return {ITemplateList} An object containing the kitId and its available templates
     */
    public getAllTemplates(): Q.Promise<TemplateManager.ITemplateList> {
        return this.kitHelper.getAllTemplates()
            .then(function (results: TacoKits.ITemplateOverrideInfo[]): Q.Promise<TemplateManager.ITemplateList> {
                return Q.resolve({
                    kitId: "",
                    templates: results.map(templateInfo => new TemplateDescriptor(templateInfo))
                });
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

    private acquireTemplate(templateId: string, kitId: string): Q.Promise<string> {
        if (/^https?:\/\//.test(templateId)) {
            return this.acquireFromGit(templateId);
        } else {
            return this.acquireFromTacoKits(templateId, kitId);
        }
    }

    private acquireFromGit(templateUrl: string): Q.Promise<string> {
        var gitTemplatesCache: string = path.join(this.templateCachePath, TemplateManager.GitTemplatesFolderName);
        var templateLocation: string = path.join(gitTemplatesCache, encodeURIComponent(templateUrl));

        if (fs.existsSync(templateLocation)) {
            return this.gitPull(templateLocation);
        } else {
            return this.gitClone(templateLocation);
        }
    }

    private gitPull(repo: string): Q.Promise<string> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var command: string = "git";
        var args: string[] = [
            "pull"
        ];
        var options: childProcess.IExecOptions = { cwd: repo, stdio: "inherit" };

        childProcess.spawn(command, args, options)
            .on("error", function (err: any): void {  
                if (err.code == "ENOENT") {
                    deferred.reject(errorHelper.get(TacoErrorCodes.CordovaCmdNotFound));
                }
                // ENOENT error thrown if no git is found
                var tacoError = (err.code === "ENOENT") ?
                    errorHelper.get(TacoErrorCodes.CordovaCmdNotFound) :
                    errorHelper.wrap(TacoErrorCodes.CordovaCommandFailedWithError, err, args.join(" "));
                deferred.reject(tacoError);
            })
            .on(

    }

    private gitClone(repo: string): Q.Promise<string> {

    }

    private acquireFromTacoKits(templateId: string, kitId: string): Q.Promise<string> {
        var self = this;

        return this.kitHelper.getTemplateOverrideInfo(kitId, templateId)
            .then(function (templateOverrideForKit: TacoKits.ITemplateOverrideInfo): Q.Promise<string> {
                var templateInfo = templateOverrideForKit.templateInfo;

                self.templateName = templateInfo.name;

                return self.findTemplatePath(templateId, templateOverrideForKit.kitId, templateInfo);
            });
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
