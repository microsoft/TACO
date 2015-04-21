/// <reference path="../../../typings/wrench.d.ts" />
/// <reference path="../../../typings/replace.d.ts" />
/// <reference path="../../../typings/taco-utils.d.ts"/>
/// <reference path="../../../typings/adm-zip.d.ts"/>

"use strict";
import Q = require ("q");
import path = require ("path");
import fs = require ("fs");
import wrench = require ("wrench");
import replace = require ("replace");
import admZip = require ("adm-zip");
import tacoUtility = require ("taco-utils");
import tacoKits = require ("taco-kits");
import logger = tacoUtility.Logger;
import resources = tacoUtility.ResourcesManager;
import utils = tacoUtility.UtilHelper;
import kitHelper = tacoKits.KitHelper;
import cordovaWrapper = require ("./cordova-wrapper");

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

// TEMP this will be merged with the real KitHelper module
// TODO move the strings used below to wherever the KitHelper module will be (taco-utils?)
module KitHelper {
    export interface ITemplateInfo {
        id: string;
        kitId: string;
        archiveUrl: string;
        displayName: string;
    }

    interface ITemplateMetaData {
        [kitName: string]: {
            [templateName: string]: {
                name: string;
                url: string;
            };
        };
    }

    export class KitHelper {
        /**
         * Looks in the template metadata to collect the info on the specified template
         *
         * @param {string} The id of the desired kit
         * @param {string} The id of the desired template
         *
         * @return {Q.Promise<ITemplateInfo>} A Q promise that is resolved with the ITemplateInfo object as the result, or with null if no metadata was previously loaded
         */
        public static getTemplateInfo(kitId: string, templateId: string): Q.Promise<ITemplateInfo> {
            var templateMetaData: ITemplateMetaData = null;

            return KitHelper.getTemplateMetaData()
                .then(function (metaData: ITemplateMetaData): Q.Promise<string> {
                    templateMetaData = metaData;

                    return kitId ? Q.resolve(kitId) : KitHelper.getDefaultKit();
                })
                .then(function (kitId: string): Q.Promise<ITemplateInfo> {
                    var templateInfoPromise: Q.Deferred<ITemplateInfo> = Q.defer<ITemplateInfo>();
                    var templateInfo: ITemplateInfo = {
                        id: templateId,
                        kitId: "",
                        archiveUrl: "",
                        displayName: ""
                    };

                    if (templateMetaData[kitId]) {
                        // Found an override for the specified kit
                        if (templateMetaData[kitId][templateId]) {
                            // Found the specified template
                            templateInfo.kitId = kitId;
                            templateInfo.archiveUrl = templateMetaData[kitId][templateId].url;
                            templateInfo.displayName = templateMetaData[kitId][templateId].name;
                            templateInfoPromise.resolve(templateInfo);
                        } else {
                            // Error, the kit override does not define the specified template id
                            if (templateId === "typescript") {
                                // We have a special error message for typescript
                                logger.logErrorLine(resources.getString("command.create.noTypescript"));
                                templateInfoPromise.reject("command.create.noTypescript");
                            } else {
                                logger.logErrorLine(resources.getString("command.create.templateNotFound", templateId));
                                templateInfoPromise.reject("command.create.templateNotFound");
                            }
                        }
                    } else if (templateMetaData["default"][templateId]) {
                        // Found a default template matching the specified template id
                        templateInfo.kitId = "default";
                        templateInfo.archiveUrl = templateMetaData["default"][templateId].url;
                        templateInfo.displayName = templateMetaData["default"][templateId].name;

                        templateInfoPromise.resolve(templateInfo);
                    } else {
                        // Error, no template matching the specified template id
                        logger.logErrorLine(resources.getString("command.create.templateNotFound", templateId));
                        templateInfoPromise.reject("command.create.templateNotFound");
                    }

                    return templateInfoPromise.promise;
                });
        }

        private static getDefaultKit(): Q.Promise<string> {
            // TEMP Return a hard-coded value for now
            return Q.resolve<string>("4.0.0-Kit");
        }

        private static getTemplateMetaData(): Q.Promise<ITemplateMetaData> {
            // TEMP return hard-coded meta-data for now
            var templateMetaData: ITemplateMetaData = {
                default: {
                    blank: {
                        name: "Blank template",
                        url: path.resolve(__dirname, "..", "..", "..", "..", "templates", "default", "blank.zip")
                    },
                    typescript: {
                        name: "Blank TypeScript template",
                        url: path.resolve(__dirname, "..", "..", "..", "..", "templates", "default", "typescript.zip")
                    }
                }
            };

            return Q.resolve(templateMetaData);
        }
    }
}

export = TemplateManager;