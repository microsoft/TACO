/**
 * ******************************************************
 *                                                       *
 *   Copyright (C) Microsoft. All rights reserved.       *
 *                                                       *
 * ******************************************************
 */
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/taco-utils.d.ts" />

"use strict";
import Q = require ("q");
import path = require ("path");
import fs = require ("fs");
import tacoUtility = require("taco-utils");
import resourcesManager = tacoUtility.ResourcesManager;
import logger = tacoUtility.Logger;

module TacoKits {
    export interface IPluginOverrideMetadata {
        [pluginId: string]: {
            name: string;
            version: string;
            src: string;
            platforms: string[];
        };
    }
    
    export interface IPlatformOverrideMetadata {
        [platformName: string]: {
            version: string;
            src: string;
        };
    }

    export interface ITemplateOverrideInfo {
        kitId: string;
        templateInfo: ITemplateInfo;
    }

    export interface ITemplateInfo {
        name: string;
        url: string;
    }

    export interface ITemplateMetadata {
        [kitId: string]: {
            [templateId: string]: ITemplateInfo;
        }
    }

    export interface IKitInfo {
        kitId: string;
        "cordova-cli": string;
        "taco-min": string;
        name: string;
        description?: string;
        releaseNotesUri?: string;
        deprecated?: boolean;
        deprecatedReasonUri?: boolean;
        default?: boolean;
        plugins?: IPluginOverrideMetadata;
        platforms?: IPlatformOverrideMetadata;
    }

    export interface IKitMetadata {
        [kitId: string]: IKitInfo;
    }

    export interface IPluginInfo {
        pluginId: string;
        name: string;
        description?: string;
        platforms?: string[];
    }

    export interface IPluginMetadata {
        [pluginId: string]: IPluginInfo;
    }

    export interface ITacoKitMetadata {
        plugins?: IPluginMetadata;
        kits?: IKitMetadata;
        templates?: ITemplateMetadata;
    }
    /**
     *   KitHelper class exports methods for parsing the kit metadata file (TacoKitMetaData.json)
     */
    export class KitHelper {
        private static kitMetadata: ITacoKitMetadata;
        private static kitFileName: string = "TacoKitMetadata.json";
        private static tsTemplateId: string = "typescript";
        private static defaultKitId: string;

        /**
         *   Initializes resource manager with the locale for resource strings
         */
        public static init(locale: string): void {
            var resourcePath: string = path.resolve(__dirname, "resources");
            resourcesManager.init(locale, resourcePath);
        }

        /**
         *   Returns a promise which is either rejected with a failure to parse or find kits metadata file
         *   or resolved with the parsed metadata
         */ 
        public static getKitMetadata(): Q.Promise<ITacoKitMetadata> {
            if (KitHelper.kitMetadata) {
                return Q(KitHelper.kitMetadata);
            }
            var kitsPath = path.resolve(__dirname, KitHelper.kitFileName);
            try {
                if (!fs.existsSync(kitsPath)) {
                    return Q.reject<ITacoKitMetadata>(new Error(resourcesManager.getString("taco-kits.exception.kitMetadataFileNotFound")));
                }
                KitHelper.kitMetadata = require(kitsPath);
                return Q(KitHelper.kitMetadata);
            } catch (e) {
                return Q.reject<ITacoKitMetadata>(new Error(resourcesManager.getString("taco-kits.exception.kitMetadataFileMalformed")));
            }
        }
        
        /**
        *   Returns a promise which is either rejected with a failure to find the specified kit
        *   or resolved with the information regarding the kit
        */
        private static getKitInfo(kitId: string): Q.Promise<IKitInfo> {
            var kits: IKitMetadata = null;
            var deferred: Q.Deferred<IKitInfo> = Q.defer<IKitInfo>();
            return KitHelper.getKitMetadata()
                .then(function (Metadata: ITacoKitMetadata): Q.Promise<IKitInfo> {
                    kits = Metadata.kits;
                    if (kitId && kits && kits[kitId]) {
                        if (kits[kitId].deprecated) {
                            deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidKit", kitId)));
                        }
                        else {
                            // Found the specified kit
                            deferred.resolve(kits[kitId]);
                        }
                    } else {
                        // Error, empty kitId or no kit matching the kit id
                        deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidKit", kitId)));
                    }
                return deferred.promise;
            });
        }

        /**
        *   Returns a promise which is either rejected with a failure to find the Cordova Cli
        *   attribute for the kit or resolved with the Cli attribute found in the matadata file
        */
        private static getCordovaCliForKit(kitId: string): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitInfo(kitId).then(function (kitInfo: IKitInfo): Q.Promise<string> {
                if (kitInfo["cordova-cli"]) {
                    deferred.resolve(kitInfo["cordova-cli"]);
                }
                else {
                    deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.NoCliSpecification", kitId)));
                }
                return deferred.promise;
            });
        }

        /**
         *  Returns a promise resolved with the Id of the default kit or rejected with error
         *  Note that the default kit is one with default attribute set to 'true'
         */
        public static getDefaultKit(): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            if (KitHelper.defaultKitId) {
                deferred.resolve(KitHelper.defaultKitId);
                return deferred.promise;
            }
            else {
                return KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<string> {
                    var kits: IKitMetadata = Metadata.kits;
                    Object.keys(kits).some(function (kitId: string): boolean {
                        // Get the kit for which the default attribute is set to true
                        if (kits[kitId].default) {
                            KitHelper.defaultKitId = kitId;
                            deferred.resolve(kitId);
                            return true;
                        }
                    });
                    return deferred.promise;
                });
            }
        }

        /**
         *  Returns a promise resolved with the Cordova Cli used by the default kit
         *  Note that the default kit is one with default attribute set to 'true'
         */
        private static getCordovaCliForDefaultKit(): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getDefaultKit().then(function (defaultKit: string): Q.Promise<string> {
                return KitHelper.getCordovaCliForKit(defaultKit);
            });
            return deferred.promise;
        }

        /**
         *   Returns a promise resolved by a valid cordova Cli for the kitId
         *   If kitId param is a valid {kitId}, returns the cordova Cli used by the kit with id {kitId}
         *   Otherwise, returns the cordovaCli used by the default kit
         */
        public static getValidCordovaCli(kitId: string): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            if (kitId) {
                return KitHelper.getCordovaCliForKit(kitId);
            }
            else {
                return KitHelper.getCordovaCliForDefaultKit();
            }
        }

        /**
         *  Returns a promise resolved with the platform override info for the kit
         */
        public static getPlatformOverridesForKit(kitId: string): Q.Promise<IPlatformOverrideMetadata> {
            var deferred: Q.Deferred<IPlatformOverrideMetadata> = Q.defer<IPlatformOverrideMetadata>();
            return KitHelper.getKitInfo(kitId).then(function (kitInfo: IKitInfo): Q.Promise<IPlatformOverrideMetadata> {
                if (kitInfo.platforms) {
                    deferred.resolve(kitInfo.platforms);
                }
                else {
                    deferred.resolve(null);
                }
                return deferred.promise;
            });
        }

        /**
         *  Returns a promise resolved with the plugin override info for the kit
         */
        public static getPluginOverridesForKit(kitId: string): Q.Promise<IPluginOverrideMetadata> {
            var deferred: Q.Deferred<IPluginOverrideMetadata> = Q.defer<IPluginOverrideMetadata>();
            return KitHelper.getKitInfo(kitId).then(function (kitInfo: IKitInfo): Q.Promise<IPluginOverrideMetadata> {
                if (kitInfo.platforms) {
                    deferred.resolve(kitInfo.plugins);
                }
                else {
                    deferred.resolve(null);
                }
                return deferred.promise;
            });
        }

        /**
         *   Returns a promise reolved by a boolean value indicating
         *   whether the specified kit is deprecated, or not
         */
        public static isKitDeprecated(kitId: string): Q.Promise<boolean> {
            var deferred: Q.Deferred<boolean> = Q.defer<boolean>();
            return KitHelper.getKitInfo(kitId).then(function (kitInfo: IKitInfo): Q.Promise<boolean> {
                deferred.resolve(kitInfo.deprecated ? true : false);
                return deferred.promise;
            });
        }

        /**
         *   Returns the template metadata for all the kits from the TacoKitMetadata.json file
         */
        private static getTemplateMetadata(): Q.Promise<ITemplateMetadata> {
            var deferred: Q.Deferred<ITemplateMetadata> = Q.defer<ITemplateMetadata>();
            return KitHelper.getKitMetadata()
                .then(function (Metadata: ITacoKitMetadata): Q.Promise<ITemplateMetadata> {
                var templates = Metadata.templates;
                if (templates) {
                    deferred.resolve(templates);
                } else {
                    deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidKit")));
                }
                return deferred.promise;
            });
        }

        /**
         *   Returns a promise resolved by the template override information for the specified kit
         *   If there is an override for {kitId} -> returns the template override info for the {templateId}
         *   Else -> returns the default template information with id {templateId}
         */
        public static getTemplateOverrideInfo(kitId: string, templateId: string): Q.Promise<ITemplateOverrideInfo> {
            var deferred: Q.Deferred<ITemplateOverrideInfo> = Q.defer<ITemplateOverrideInfo>();
            var templates: ITemplateMetadata = null;
            var templateOverrideInfo: ITemplateOverrideInfo = {
                kitId: '', templateInfo: { name: '', url: '' }
            };
            return KitHelper.getTemplateMetadata()
                .then(function (templateMetadata: ITemplateMetadata): Q.Promise<string> {
                    templates = templateMetadata;
                    return kitId ? Q.resolve(kitId) : KitHelper.getDefaultKit();
            })
                .then(function (kitId: string): Q.Promise<ITemplateOverrideInfo> {
                if (templates[kitId]) {
                    // Found an override for the specified kit
                    if (templates[kitId][templateId]) {
                        // Found the specified template
                        templateOverrideInfo.kitId = kitId;
                        templateOverrideInfo.templateInfo = templates[kitId][templateId];

                        // Convert the url from relative to absolute local path
                        templateOverrideInfo.templateInfo.url = path.resolve(__dirname, templateOverrideInfo.templateInfo.url);
                        deferred.resolve(templateOverrideInfo);
                    } else {
                        // Error, the kit override does not define the specified template id
                        if (templateId === KitHelper.tsTemplateId) {
                            // We have a special error message for typescript
                            deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.TypescriptNotSupported")));
                        } else {
                            deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidTemplate")));
                        }
                    }
                } else if (templates["default"][templateId]) {
                    // Found a default template matching the specified template id
                    templateOverrideInfo.kitId = "default";
                    templateOverrideInfo.templateInfo = templates["default"][templateId];

                    // Convert the url from relative to absolute local path
                    templateOverrideInfo.templateInfo.url = path.resolve(__dirname, templateOverrideInfo.templateInfo.url);
                    deferred.resolve(templateOverrideInfo);
                } else {
                    // Error, no template matching the specified template id
                    deferred.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidTemplate")));
                }
                return deferred.promise;
                });
        }
    }
}

export = TacoKits;