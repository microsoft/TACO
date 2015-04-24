/// <reference path="../../../typings/wrench.d.ts" />
/// <reference path="../../../typings/replace.d.ts" />
/// <reference path="../../../typings/tacoUtils.d.ts"/>
/// <reference path="../../../typings/tacoKits.d.ts"/>
/// <reference path="../../../typings/adm-zip.d.ts"/>

"use strict";

import admZip = require("adm-zip");
import fs = require("fs");
import path = require ("path");
import Q = require("q");
import replace = require("replace");
import wrench = require ("wrench");

import cordovaWrapper = require("./cordovaWrapper");
import resources = require("../../resources/resourceManager");
import tacoUtility = require ("taco-utils");
import tacoKits = require ("taco-kits");

import logger = tacoUtility.Logger;
import utils = tacoUtility.UtilHelper;
import kitHelper = tacoKits.KitHelper;

interface IKitHelper {
    getTemplateOverrideInfo: (kitId: string, templateId: string) => Q.Promise<TacoKits.ITemplateInfo>;
}

class TemplateManager {
    private static DefaultTemplateId: string = "blank";

    /*
     * The following members are public static to expose access to automated tests
     */
    public static TemplateCachePath: string = null;
    public static Kits: IKitHelper = null;

    /**
     * Creates a kit project using 'cordova create' with the specified template.
     *
     * @param {string} The id of the desired kit
     * @param {string} The id of the desired template
     * @param {string} The path where to create the project
     * @param {string} The id of the app
     * @param {string} The name of the app
     * @param {string} A JSON string whose key/value pairs will be added to the Cordova config file by Cordova
     * @param {[option: string]: any} The options to give to Cordova
     * @param {string[]} The options to ignore when executing the 'cordova create' command
     *
     * @return {Q.Promise<string>} A Q promise that is resolved with the template's display name if there are no errors
     */

    public static createKitProjectWithTemplate(kitId: string, templateId: string, cordovaCli: string, path: string, appId?: string, appName?: string, cordovaConfig?: string, options?: { [option: string]: any }, optionsToExclude?: string[]): Q.Promise<string> {
        var templateName: string = null;
        var templateSrcPath: string = null;
      
        templateId = templateId ? templateId : TemplateManager.DefaultTemplateId;
        
        return kitHelper.getTemplateOverrideInfo(kitId, templateId)
            .then(function (templateOverrideForKit: TacoKits.ITemplateOverrideInfo): Q.Promise<string> {
                var templateInfo = templateOverrideForKit.templateInfo;
                templateName = templateInfo.name;
                return TemplateManager.findTemplatePath(templateId, templateOverrideForKit.kitId, templateInfo);
            })
            .then(function (templatePath: string): Q.Promise<any> {
                templateSrcPath = templatePath;
                options["copy-from"] = templateSrcPath;

                return cordovaWrapper.create(cordovaCli, path, appId, appName, cordovaConfig, utils.cleanseOptions(options, optionsToExclude));
            })
            .then(function (): Q.Promise<any> {
                var options: any = { clobber: false };

                return utils.copyRecursive(templateSrcPath, path, options);
            })
            .then(function (): Q.Promise<any> {
                return TemplateManager.performTokenReplacements(path, appId, appName);
            })
            .then(function (): Q.Promise<string> {
                return Q.resolve(templateName);
            });
    }

    private static findTemplatePath(templateId: string, kitId: string, templateInfo: TacoKits.ITemplateInfo): Q.Promise<string> {
        // Look through template cache to find the requested template
        if (!TemplateManager.TemplateCachePath) {
            TemplateManager.TemplateCachePath = path.join(utils.tacoHome, "templates");
        }

        // TODO sanitize kitId before using it as a folder name?
        var cachedTemplateKitPath: string = path.join(TemplateManager.TemplateCachePath, kitId);
        var cachedTemplatePath: string = path.join(cachedTemplateKitPath, templateId);

        if (!fs.existsSync(cachedTemplatePath)) {
            // Download template's archive file
            // TODO
            // TEMP for now, the templates are in our git repo, so "downloading" a template simply means unzipping it from the repo location to the cache.
            if (!fs.existsSync(templateInfo.url)) {
                logger.logErrorLine(resources.getString("command.create.templatesUnavailable"));

                return Q.reject<string>("command.create.templatesUnavailable");
            }

            // Cache does not contain the specified template, create the directory tree to cache it
            wrench.mkdirSyncRecursive(cachedTemplateKitPath, 511); // 511 decimal is 0777 octal

            // Extract the template archive to the cache
            var templateZip = new admZip(templateInfo.url);

            templateZip.extractAllTo(cachedTemplateKitPath);

            return Q.resolve(cachedTemplatePath);
        } else {
            // Template already extracted to cache
            return Q.resolve(cachedTemplatePath);
        }
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
}

export = TemplateManager;