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

    export interface ITemplateInfo {
        id: string;
        kitId: string;
        archiveUrl: string;
        displayName: string;
    }

    interface ITemplateMetadata {
        [kitName: string]: {
            [templateName: string]: {
                name: string;
                url: string;
            };
        };
    }

    export interface IKitInfo {
        kitId: string;
        cli: string;
        tacoMin: string;
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
         *   Initializes the metadata property of KitHelper by parsing the metadata file
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
         *   Returns information regarding a particular kit
         */
        public static getKitInfo(kitId: string): Q.Promise<IKitInfo> {
            var kits: IKitMetadata = null;
            var deferredPromise: Q.Deferred<IKitInfo> = Q.defer<IKitInfo>();
            return KitHelper.getKitMetadata()
                .then(function (Metadata: ITacoKitMetadata): Q.Promise<IKitInfo> {
                    kits = Metadata.kits;
                    if (kits[kitId]) {
                    // Found the specified kit
                    deferredPromise.resolve(kits[kitId]);
                } else {
                    // Error, no kit matching the kit id
                    deferredPromise.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidKit", kitId)));
                }
                return deferredPromise.promise;
            });
        }

        /**
         *   Returns information regarding all the plugins supported
         */
        public static getAllPluginsInfo(): Q.Promise<IPluginMetadata> {
            var deferredPromise: Q.Deferred<IPluginMetadata> = Q.defer<IPluginMetadata>();
            return KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<IPluginMetadata> {
                var plugins: IPluginMetadata = Metadata.plugins;
                deferredPromise.resolve(Metadata.plugins);
                return deferredPromise.promise;
            }); 
        }

        /**
         *  Returns the Id of the default kit 
         *  Note that the default kit is one with default attribute set to 'true'
         */
        public static getDefaultKit(): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<string> {
                var kits: IKitMetadata = Metadata.kits;
                Object.keys(kits).forEach(function (kitId: string): Q.Promise<string> {
                    // Get the kit for which the default attribute is set to true
                    if (kits[kitId].default) {
                        deferredPromise.resolve(kitId);
                        return deferredPromise.promise;
                    }
                });
                deferredPromise.reject(new Error(resourcesManager.getString("taco-kits.exception.NoDefaultKit")));
                return deferredPromise.promise;
            }); 
        }

        /**
         *   Returns the Cordova Cli used by the default kit 
         */
        public static getCordovaCliForDefaultKit(): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<string> {
                var kits: IKitMetadata = Metadata.kits;
                Object.keys(kits).forEach(function (kitId: string): Q.Promise<string> {
                    // Get the kit for which the default attribute is set to true
                    if (kits[kitId].default) {
                        deferredPromise.resolve(kits[kitId].cli);
                        return deferredPromise.promise;
                    }
                });
                deferredPromise.reject(new Error(resourcesManager.getString("taco-kits.exception.NoDefaultKit")));
                return deferredPromise.promise;
            }); 
        }

        /**
         *   Returns a valid CLI for the kitId
         *   If kitId param is a valid {kitId}, returns the CLI used by the kit with id {kitId}
         *   Otherwise, returns the CLI used by the default kit
         */
        public static getValidCordovaCli(kitId: string): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<string> {
                var kits: IKitMetadata = Metadata.kits;
                if (kitId && kits[kitId]) {
                    deferredPromise.resolve(kits[kitId].cli);
                    return deferredPromise.promise;
                }
                else {
                    return KitHelper.getCordovaCliForDefaultKit();
                }
            });
            return deferredPromise.promise;
        }

        /**
         *   Returns the Cordova CLI used by the kit
         */
        public static getCordovaCliForKit(kitId: string): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<string> {
                var kits: IKitMetadata = Metadata.kits;
                deferredPromise.resolve(kits[kitId].cli);
                return deferredPromise.promise;
            });
            deferredPromise.reject(new Error(resourcesManager.getString("taco-kits.exception.NoCliSpecification")));
            return deferredPromise.promise;
        }

        /**
         *   Returns all the platform overrides of the specified kit
         */
        public static getPlatformOverridesForKit(kitId: string): Q.Promise<IPlatformOverrideMetadata> {
            var kits: IKitMetadata = null;
            var deferredPromise: Q.Deferred<IPlatformOverrideMetadata> = Q.defer<IPlatformOverrideMetadata>();
            return KitHelper.getKitMetadata()
                .then(function (Metadata: ITacoKitMetadata): Q.Promise<IPlatformOverrideMetadata> {
                    kits = Metadata.kits;
                    if (kits[kitId]) {
                        if (kits[kitId].platforms) {
                            deferredPromise.resolve(null);
                        } else {
                            deferredPromise.resolve(kits[kitId].platforms);
                        }
                    }
                    else {
                        // Error, no kit matching the kit id
                        deferredPromise.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidKit", kitId)));
                    } 
                return deferredPromise.promise;
            });
        }

        /**
         *   Returns all the plugin overrides of the specified kit
         */
        public static getPluginOverridesForKit(kitId: string): Q.Promise<IPluginOverrideMetadata> {
            var kits: IKitMetadata = null;
            var deferredPromise: Q.Deferred<IPluginOverrideMetadata> = Q.defer<IPluginOverrideMetadata>();
            return KitHelper.getKitMetadata()
                .then(function (Metadata: ITacoKitMetadata): Q.Promise<IPluginOverrideMetadata> {
                    kits = Metadata.kits;
                    if (kits[kitId]) {
                        if (kits[kitId].plugins) {
                            deferredPromise.resolve(null);
                        } else {
                            deferredPromise.resolve(kits[kitId].plugins);
                        }
                    }
                    else {
                        // Error, no kit matching the kit id
                        deferredPromise.reject(new Error(resourcesManager.getString("taco-kits.exception.InvalidKit", kitId)));
                    }
                return deferredPromise.promise;
            });
        }

        /**
         *   Returns true is a kit is deprecated, false otherwise
         */
        public static isKitDeprecated(kitId: string): Q.Promise<boolean> {
            var deferredPromise: Q.Deferred<boolean> = Q.defer<boolean>();
            return KitHelper.getKitMetadata().then(function (Metadata: ITacoKitMetadata): Q.Promise<boolean> {
                var kits: IKitMetadata = Metadata.kits;
                deferredPromise.resolve(kits[kitId] && kits[kitId].deprecated ? true : false);
                return deferredPromise.promise;
            });
            deferredPromise.resolve(false);
            return deferredPromise.promise;
        }

        /**
         *   Returns info regarding the specified template
         */
        public static getTemplateInfo(kitId: string, templateId: string): Q.Promise<ITemplateInfo> {
            var templateMetadata: ITemplateMetadata = null;
            return KitHelper.getKitMetadata()
                .then(function (Metadata: ITacoKitMetadata): Q.Promise<ITemplateMetadata> {
                templateMetadata = Metadata.templates;

                return Q.resolve(templateMetadata);
            }).then(function (Metadata: ITemplateMetadata): Q.Promise<string> {
                templateMetadata = Metadata;

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

                if (templateMetadata[kitId]) {
                    // Found an override for the specified kit
                    if (templateMetadata[kitId][templateId]) {
                        // Found the specified template
                        templateInfo.kitId = kitId;
                        templateInfo.archiveUrl = templateMetadata[kitId][templateId].url;
                        templateInfo.displayName = templateMetadata[kitId][templateId].name;
                        templateInfoPromise.resolve(templateInfo);
                    } else {
                        // Error, the kit override does not define the specified template id
                        if (templateId === KitHelper.tsTemplateId) {
                            // We have a special error message for typescript
                            templateInfoPromise.reject("taco-kits.exception.TypescriptNotSupported");
                        } else {
                            templateInfoPromise.reject("taco-kits.exception.InvalidTemplate");
                        }
                    }
                } else if (templateMetadata["default"][templateId]) {
                    // Found a default template matching the specified template id
                    templateInfo.kitId = "default";
                    templateInfo.archiveUrl = templateMetadata["default"][templateId].url;
                    templateInfo.displayName = templateMetadata["default"][templateId].name;

                    templateInfoPromise.resolve(templateInfo);
                } else {
                    // Error, no template matching the specified template id
                    templateInfoPromise.reject("taco-kits.exception.InvalidTemplate");
                }

                return templateInfoPromise.promise;
            });
        }
    }
}

export = TacoKits;