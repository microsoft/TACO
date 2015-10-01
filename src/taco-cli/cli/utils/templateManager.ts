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
import crypto = require ("crypto");
import fs = require ("fs");
import os = require ("os");
import path = require ("path");
import Q = require ("q");
import replace = require ("replace");
import rimraf = require ("rimraf");
import wrench = require ("wrench");

import cordovaHelper = require ("./cordovaHelper");
import cordovaWrapper = require ("./cordovaWrapper");
import resources = require ("../../resources/resourceManager");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import logger = tacoUtility.Logger;
import loggerHelper = tacoUtility.LoggerHelper;
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
    private static DEFAULT_TEMPLATE_ID: string = "blank";
    private static TEMPLATES_FOLDER_NAME: string = "templates";
    private static GIT_FILE_LIST: string[] = [
        ".git",
        ".gitignore",
        ".gitattributes"
    ];

    private templateCachePath: string = null;
    private kitHelper: TacoKits.IKitHelper = null;
    private templateName: string = null;

    constructor(kits: TacoKits.IKitHelper, templateCache?: string) {
        this.kitHelper = kits;
        this.templateCachePath = templateCache || path.join(utils.tacoHome, TemplateManager.TEMPLATES_FOLDER_NAME);
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

        templateId = templateId ? templateId : TemplateManager.DEFAULT_TEMPLATE_ID;

        return this.acquireTemplate(templateId, kitId)
            .then(function (templatePath: string): Q.Promise<any> {
                templateSrcPath = templatePath;
                cordovaParameters.copyFrom = templateSrcPath;

                return cordovaWrapper.create(cordovaCliVersion, cordovaParameters);
            })
            .then(function (): Q.Promise<any> {
                /*
                Cordova's --copy-from behavior: "cordova create [project path] --copy-from [template path]" supports 2 scenarios: 1) The template is for the entire project; 2) The template is only
                for the www assets.

                Cordova looks for a "www" folder at the root of the specified path ("the template"). If it finds one, then it assumes we are in case 1), otherwise it assumes we are in case 2).

                For case 1), Cordova looks for 4 specific items at the root of the template: "config.xml", "www\", "merges\" and "hooks\". When it finds one of those items, Cordova copies it to the
                user's project, otherwise it uses the default for that particular item. It ignores everything else in the template.

                For case 2), Cordova copies everything it finds in the template over to the "www\" folder of the user's project, and uses default items for everything else ("config.xml", "merges\",
                etc).

                What this means for TACO project creation: If we are in case 1), we need to copy the template items that Cordova ignored. For simplicity, we will simply recursively copy the entire
                template folder to the user's project, while using the "clobber = false" option of the NCP package. That way, all the items get copied over, but those that were already copied by
                Cordova are ignored. If we are in case 2), it means we don't have anything to do, because Cordova already copied all the template items to the "www\" folder of the user's project.
                */

                // If we are in case 2) (see above comment), we need to skip the copy step
                var skipCopy: boolean = !fs.readdirSync(templateSrcPath).some(function (itemPath: string): boolean {
                    return path.basename(itemPath) === "www";
                });

                if (skipCopy) {
                    return Q.resolve({});
                }

                // If we reach this point, we are in case 1) (see above comment), so we need to perform a recursive copy
                var filterFunc = function (itemPath: string): boolean {
                    // Return true if the item path is not in our list of git files to ignore
                    return TemplateManager.GIT_FILE_LIST.indexOf(path.basename(itemPath)) === -1;
                };
                var options: any = { clobber: false, filter: filterFunc };

                return utils.copyRecursive(templateSrcPath, cordovaParameters.projectPath, options);
            })
            .then(function (): Q.Promise<any> {
                // If we extracted a git template to the temp directory, attempt to clean it here
                var deferred: Q.Deferred<any> = Q.defer<any>();

                if (path.resolve(path.dirname(templateSrcPath)) === path.resolve(os.tmpdir())) {
                    rimraf(templateSrcPath, function (err: Error): void {
                        // This is best effort, resolve the promise whether there was an error or not
                        deferred.resolve({});
                    });
                } else {
                    deferred.resolve({});
                }

                return deferred.promise;
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

    private acquireTemplate(templateId: string, kitId: string): Q.Promise<string> {
        if (/^https?:\/\//.test(templateId)) {
            this.templateName = resources.getString("CommandCreateGitTemplateName");

            return this.acquireFromGit(templateId)
                .then(function (templateLocation: string): string {
                    loggerHelper.logSeparatorLine();

                    return templateLocation;
                });
        } else {
            return this.acquireFromTacoKits(templateId, kitId);
        }
    }

    private acquireFromGit(templateUrl: string): Q.Promise<string> {
        loggerHelper.logSeparatorLine();
        logger.log(resources.getString("CommandCreateGitTemplateHeader"));

        return this.gitClone(templateUrl);
    }

    private gitClone(repo: string): Q.Promise<string> {
        var deferred: Q.Deferred<any> = Q.defer<any>();

        // Set up a temporary folder for the git clone
        var tmpDir: string = os.tmpdir();
        var cloneTo: string = "taco_template_" + crypto.pseudoRandomBytes(20).toString("hex");

        while (fs.existsSync(path.join(tmpDir, cloneTo))) {
            cloneTo = "taco_template_" + crypto.pseudoRandomBytes(20).toString("hex");
        }

        var destination: string = path.join(tmpDir, cloneTo);
        var command: string = "git";
        var args: string[] = [
            "clone",
            "--depth",  // Use the "--depth 1" option to minimize bandwidth usage, as we are only interested in the final state of the repo
            "1",
            repo,
            destination
        ];
        var options: childProcess.IExecOptions = { cwd: tmpDir, stdio: "inherit" }; // Set cwd for the git child process to be in the temporary dir to ensure any created log or other files get created there

        childProcess.spawn(command, args, options)
            .on("error", function (err: any): void {
                if (err.code === "ENOENT") {
                    // ENOENT error thrown if no git is found
                    deferred.reject(errorHelper.get(TacoErrorCodes.CommandCreateNoGit));
                } else {
                    deferred.reject(err);
                }
            })
            .on("exit", function (code: number): void {
                if (code) {
                    deferred.reject(errorHelper.get(TacoErrorCodes.CommandCreateGitCloneError));
                } else {
                    deferred.resolve(destination);
                }
            });

        return deferred.promise;
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
