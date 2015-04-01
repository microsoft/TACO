/// <reference path="../../../typings/wrench.d.ts" />
/// <reference path="../../../typings/replace.d.ts" />
/// <reference path="../../../typings/tar.d.ts" />
/// <reference path="../../../typings/templates.d.ts" />

"use strict";
import Q = require ("q");
import path = require ("path");
import fs = require ("fs");
import zlib = require ("zlib");
import wrench = require ("wrench");
import tar = require ("tar");
import replace = require ("replace");
import tacoUtility = require ("taco-utils");
import utils = tacoUtility.UtilHelper;

module TemplateHelper {
    export interface ITemplateCacheInfo {
        id: string;
        kitId: string;
        url: string;
    }

    export class TemplateHelper {
        /*
         * Template metadata is kept in a public static member for automated test purposes
         */
        public static TemplateMetaData: Templates.ITemplateMetaData = null;

        /*
         * Current project kit is kept in a public static member for automated test purposes
         */
        public static ProjectKit: string = null;

        /*
         * Path of the root folder for the template cache is kept in a public static member for automated test purposes
         */
        public static TemplateCachePath: string = null;

        /**
         * Provides the path of the specified template in taco-home's template cache. If the specified template is not in the cache, then
         * the template is fetched and cached before its path is returned.
         *
         * @param {string} The name of the desired template
         *
         * @return {Q.Promise<string>} A Q promise that is resolved with the template's cached path if there are no errors, or rejected with the error's string ID
         */
        public static getCachedTemplatePath(templateName: string): Q.Promise<string> {
            // Acquire the templates metadata
            // Extract the template's cache info
            // Ensure the template is in the cache and return its cached path
            return TemplateHelper.acquireTemplatesMetaData().then(function (): Q.Promise<ITemplateCacheInfo> {
                return TemplateHelper.extractTemplateCacheInfo(templateName);
            }).then(TemplateHelper.ensureTemplateInCache);
        }

        /**
         * Copies remaining template items from the specified cached template location to the specified project folder. Once everything is copied, replaces the
         * template's tokens in the project files with their actual values.
         *
         * @param {string} The path to the user's project
         * @param {string} The path to the template's folder inside taco-cli's template cache
         * @param {[token: string]: string} A dictionary of tokens to replace in the project files and their value
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static finalizeTemplateInstallation(projectPath: string, cachedTemplatePath: string, tokens: { [token: string]: string }): Q.Promise<any> {
            return TemplateHelper.copyRemainingItems(projectPath, cachedTemplatePath).then(function (): Q.Promise<any> {
                TemplateHelper.processTokenReplacement(projectPath, tokens);
                return Q.resolve(null);
            });
        }

        /**
         * Looks in the template metadata to construct the info needed to install the specified template from taco-cli's template cache.
         *
         * @param {string} The name of the desired template
         *
         * @return {Q.Promise<ITemplateCacheInfo>} A Q promise that is resolved with the ITemplateCacheInfo object as the result, or with null if no metadata was previously loaded
         */
        private static extractTemplateCacheInfo(templateName: string): Q.Promise<ITemplateCacheInfo> {
            if (!TemplateHelper.TemplateMetaData) {
                return Q.resolve<ITemplateCacheInfo>(null);
            }

            // Get the current kit name if we're not in a test environment
            if (!TemplateHelper.ProjectKit) {
                // TODO user story 1119627
                // TEMP Until the kit-helper module is created, use a hard-coded kit name of '4.0.0-Kit'
                TemplateHelper.ProjectKit = "4.0.0-Kit";
            }

            // Select the template in the metadata
            var templateInfoPromise: Q.Deferred<ITemplateCacheInfo> = Q.defer<ITemplateCacheInfo>();
            var templateInfo: ITemplateCacheInfo = { id: templateName, kitId: "", url: "" };

            if (TemplateHelper.TemplateMetaData[TemplateHelper.ProjectKit]) {
                // Found an override for the specified kit
                if (TemplateHelper.TemplateMetaData[TemplateHelper.ProjectKit][templateName]) {
                    // Found the specified template
                    templateInfo.kitId = TemplateHelper.ProjectKit;
                    templateInfo.url = TemplateHelper.TemplateMetaData[TemplateHelper.ProjectKit][templateName].url;
                    templateInfoPromise.resolve(templateInfo);
                } else {
                    // Error, the kit override does not define the specified template id
                    if (templateName === "typescript") {
                        // We have a special error message for typescript
                        templateInfoPromise.reject("command.create.noTypescript");
                    } else {
                        templateInfoPromise.reject("command.create.templateNotFound");
                    }
                }
            } else if (TemplateHelper.TemplateMetaData["default"][templateName]) {
                // Found a default template matching the specified template id
                templateInfo.kitId = "default";
                templateInfo.url = TemplateHelper.TemplateMetaData["default"][templateName].url;
                templateInfoPromise.resolve(templateInfo);
            } else {
                // Error, no template matching the specified template id
                templateInfoPromise.reject("command.create.templateNotFound");
            }

            return templateInfoPromise.promise;
        }

        /**
         * Downloads and extracts the specified template into taco-cli's cache if needed, and then returns the path to the cached template.
         *
         * @param {ITemplateCacheInfo} An ITemplateCacheInfo object containing the desired template's cache info
         *
         * @return {Q.Promise<string>} A Q promise that is resolved with the path to the cached template as the result, or with null if the specified ITemplateCacheInfo is invalid
         */
        private static ensureTemplateInCache(templateCacheInfo: ITemplateCacheInfo): Q.Promise<string> {
            if (!templateCacheInfo.id || !templateCacheInfo.kitId) {
                return Q.resolve<string>(null);
            }

            // Look through template cache to find the requested template
            if (!TemplateHelper.TemplateCachePath) {
                TemplateHelper.TemplateCachePath = path.join(utils.tacoHome, "templates");
            }

            var cachedTemplateKitPath: string = path.join(TemplateHelper.TemplateCachePath, templateCacheInfo.kitId);
            var cachedTemplatePath: string = path.join(cachedTemplateKitPath, templateCacheInfo.id);

            if (!fs.existsSync(cachedTemplatePath)) {
                // Download template's zip file
                // TODO
                // TEMP for now, the templates are in our git repo, so "downloading" a template simply means unzipping it from the repo location
                // to the cache.
                var templateArchiveLocation: string = path.join(__dirname, templateCacheInfo.url);

                if (!fs.existsSync(templateArchiveLocation)) {
                    return Q.reject<string>("command.create.templatesUnavailable");
                }

                // Cache does not contain the specified template, create the directory tree to cache it
                wrench.mkdirSyncRecursive(cachedTemplateKitPath, 777);

                // Extract the .tar.gz
                fs.createReadStream(templateArchiveLocation).pipe(zlib.createGunzip()).pipe(tar.Extract({ path: cachedTemplateKitPath }));
            }

            // Return path to template in cache
            return Q.resolve(cachedTemplatePath);
        }

        /**
         * Copies all template items that were not automatically copied as part of the 'cordova create' pass-through over to the user's project.
         *
         * @param {string} The path to the user's project
         * @param {string} The path to the cached template
         *
         * @return {Q.Promise<any>} An empty promise
         */
        private static copyRemainingItems(projectPath: string, cachedTemplatePath: string): Q.Promise<any> {
            var options: any = { clobber: false };

            return utils.copyRecursive(cachedTemplatePath, projectPath, options);
        }

        /**
         * Replaces all occurences of the specified tokens with their specified values inside all the files of the given project. Does a blind
         * textual replacement using the replace npm package, so no parsing is involved.
         *
         * @param {string} The path to the user's project
         * @param {[token: string]: string} A dictionary mapping tokens to their value; tokens must be properly regex-escaped as they will be directly converted to a regex
         */
        private static processTokenReplacement(projectPath: string, tokens: { [token: string]: string }): void {
            var replaceParams: Replace.IReplaceParameters = {
                regex: "",
                replacement: "",
                paths: [path.resolve(projectPath)],
                recursive: true,
                silent: true
            };

            for (var token in tokens) {
                replaceParams.regex = token;
                replaceParams.replacement = tokens[token];

                replace(replaceParams);
            }
        }

        /**
         * If not in a test environment, queries the kit-helper to acquire the template metadata.
         *
         * @return {Q.Promise<any>} An empty promise
         */
        private static acquireTemplatesMetaData(): Q.Promise<any> {
            if (!TemplateHelper.TemplateMetaData) {
                // TODO user story 1119627
                // TEMP Until the kit-helper module is created, return some hard-coded metadata for the templates
                TemplateHelper.TemplateMetaData = {
                    default: {
                        blank: {
                            name: "Blank template",
                            url: "../../../../templates/default/blank.tar.gz"
                        },
                        typescript: {
                            name: "Blank TypeScript template",
                            url: "../../../../templates/default/typescript.tar.gz"
                        }
                    }
                };
            }

            return Q.resolve(null);
        }
    }
}

export = TemplateHelper;