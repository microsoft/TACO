/// <reference path="../typings/adm-zip.d.ts" />
/// <reference path="../typings/wrench.d.ts" />
/// <reference path="../typings/replace.d.ts" />

"use strict";
import Q = require("q");
import path = require("path");
import fs = require("fs");
import admZip = require("adm-zip");
import wrench = require("wrench");
import replace = require("replace");
import utils = require("./util-helper");

module TacoUtility {
    export interface ITemplateMetaData {
        [kitName: string]: {
            [templateName: string]: {
                name: string;
                url: string;
            };
        };
    }

    export interface ITemplateCacheInfo {
        id: string;
        kitId: string;
        url: string;
    }

    export class TemplateHelper {
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
            return TemplateHelper.acquireTemplatesMetaData().then(function (templateMetaData: ITemplateMetaData) {
                return TemplateHelper.extractTemplateCacheInfo(templateName, templateMetaData);
            }).then(TemplateHelper.ensureTemplateInCache);
        }

        /**
         * Copies remaining template items from the specified cached template location to the specified project folder. Once everything is copied, replace the
         * template's tokens in the project files with their actual values
         *
         * @param {string} The name of the desired template
         * @param {string} The name of the desired template
         * @param {[token: string]: string} A dictionary of tokens to replace in the project files and their value
         *
         * @return {Q.Promise<any>} An empty promise
         */
        public static finalizeTemplateInstallation(projectPath: string, cachedTemplatePath: string, tokens: {[token: string]: string}): Q.Promise<any> {
            return TemplateHelper.copyRemainingItems(projectPath, cachedTemplatePath).then(function (result) {
                TemplateHelper.processTokenReplacement(projectPath, tokens);
            });
        }

        private static acquireTemplatesMetaData(): Q.Promise<ITemplateMetaData> {
            // TODO
            // TEMP Until the kit-helper module is created, return some hard-coded metadata for the templates
            var data: ITemplateMetaData = {
                "default": {
                    "blank": {
                        "name": "Blank template",
                        "url": "templates/default/blank.zip"
                    },
                    "typescript": {
                        "name": "Blank TypeScript template",
                        "url": "templates/default/typescript.zip"
                    }
                },
                "4.0.0-Kit": {
                    "blank": {
                        "name": "Blank template",
                        "url": "templates/4.0.0-kit/blank.zip"
                    },
                    "typescript": {
                        "name": "Blank TypeScript template",
                        "url": "templates/4.0.0-kit/typescript.zip"
                    }
                },
                "5.0.0-Kit": {
                    "blank": {
                        "name": "Blank template",
                        "url": "templates/5.0.0-kit/blank.zip"
                    }
                }
            };

            return Q.resolve(data);
        }

        private static extractTemplateCacheInfo(templateName: string, templateMetaData: ITemplateMetaData): Q.Promise<ITemplateCacheInfo> {
            // Get the current kit name
            // TODO
            // TEMP Until the kit-helper module is created, use a hard-coded kit name of '4.0.0-Kit'
            var kitName: string = "4.0.0-Kit";

            // Select the template in the metadata
            var templateInfoPromise: Q.Deferred<ITemplateCacheInfo> = Q.defer<ITemplateCacheInfo>();
            var templateInfo: ITemplateCacheInfo = {
                id: templateName,
                kitId: "",
                url: ""
            }

            if (templateMetaData[kitName]) {
                // Found an override for the specified kit
                if (templateMetaData[kitName][templateName]) {
                    // Found the specified template
                    templateInfo.kitId = kitName;
                    templateInfo.url = templateMetaData[kitName][templateName].url;
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
            } else if (templateMetaData["default"][templateName]) {
                // Found a default template matching the specified template id
                templateInfo.kitId = "default";
                templateInfo.url = templateMetaData["default"][templateName].url;
            } else {
                // Error, no template matching the specified template id
                templateInfoPromise.reject("command.create.templateNotFound");
            }

            return templateInfoPromise.promise;
        }

        private static ensureTemplateInCache(templateCacheInfo: ITemplateCacheInfo): Q.Promise<string> {
            // Look through template cache to find the requested template
            var templateCacheHome: string = path.join(utils.UtilHelper.tacoHome, "templates");
            var cachedTemplateKitPath: string = path.join(templateCacheHome, templateCacheInfo.kitId);
            var cachedTemplatePath: string = path.join(cachedTemplateKitPath, templateCacheInfo.id);

            if (!fs.existsSync(cachedTemplatePath)) {
                // Cache does not contain the specified template, create the directory tree to cache it
                wrench.mkdirSyncRecursive(cachedTemplateKitPath, 777);

                // Download template's zip file
                // TODO
                // TEMP for now, the templates are in our git repo, so "downloading" a template simply means unzipping it from the repo location
                // to the cache.
                var templateZipLocation: string = path.join(__dirname, templateCacheInfo.url);
                var templateZip: admZip = new admZip(templateZipLocation);

                templateZip.extractAllTo(cachedTemplateKitPath);
            }

            // Return path to template in cache
            return Q.resolve(cachedTemplatePath);
        }

        private static copyRemainingItems(projectPath: string, cachedTemplatePath: string): Q.Promise<any> {
            var options: any = {
                preserveFiles: true
            };

            wrench.copyDirSyncRecursive(cachedTemplatePath, projectPath, options);
            return Q.resolve(null);
        }

        private static processTokenReplacement(projectPath: string, tokens: { [token: string]: string }): Q.Promise<any> {
            var replaceParams = {
                regex: "",
                replacement: "",
                paths: [path.resolve(projectPath)],
                recursive: true,
                silent: true
            }

            for (var token in tokens) {
                replaceParams.regex = token;
                replaceParams.replacement = tokens[token];
            }

            return Q.resolve(null);
        }
    }
}

export = TacoUtility;