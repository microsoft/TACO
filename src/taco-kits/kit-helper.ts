/// <reference path="../typings/Q.d.ts" />

"use strict";
import Q = require ("q");
import path = require ("path");
import fs = require ("fs");

module TacoKits {

    export interface IPluginOverrideMetaData {
        [pluginId: string]: {
            name: string;
            version: string;
            src: string;
            platforms: string[];
        };
    }
    
    export interface IPlatformOverrideMetaData {
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

    interface ITemplateMetaData {
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
        plugins?: IPluginOverrideMetaData;
        platforms?: IPlatformOverrideMetaData;
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

    export interface ITacoKitMetaData {
        plugins?: IPluginMetadata;
        kits?: IKitMetadata;
        templates?: ITemplateMetaData;
    }

    export class KitHelper {

        private static kitMetaData: ITacoKitMetaData = undefined;
        private static kitFileName = "TacoKitMetaData.json";
        private static defaultKitId: string = undefined;

        public static getKitMetaData(): Q.Promise<ITacoKitMetaData> {
            if (KitHelper.kitMetaData) {
                return Q(KitHelper.kitMetaData);
            }

            var kitsPath = path.resolve(__dirname, KitHelper.kitFileName);
            try {
                KitHelper.kitMetaData = require(kitsPath);
                return Q(KitHelper.kitMetaData);
            } catch (e) {
                return Q.reject<ITacoKitMetaData>(e);
            }
        }

        public static getKitInfo(kitId: string): Q.Promise<IKitInfo> {
            var kits: IKitMetadata = null;
            var deferredPromise: Q.Deferred<IKitInfo> = Q.defer<IKitInfo>();
            return KitHelper.getKitMetaData()
                .then(function (metaData: ITacoKitMetaData): Q.Promise<IKitInfo> {
                    kits = metaData.kits;
                    if (kits[kitId]) {
                    // Found the specified kit
                    deferredPromise.resolve(kits[kitId]);
                } else {
                    // Error, no kit matching the kit id
                    deferredPromise.reject("command.create.kitNotFound");
                }

                return deferredPromise.promise;
            });

        }

        public static getAllPluginsInfo(): Q.Promise<IPluginMetadata> {
            var deferredPromise: Q.Deferred<IPluginMetadata> = Q.defer<IPluginMetadata>();
            return KitHelper.getKitMetaData().then(function (metaData: ITacoKitMetaData): Q.Promise<IPluginMetadata> {
                var plugins: IPluginMetadata = metaData.plugins;
                deferredPromise.resolve(metaData.plugins);
                return deferredPromise.promise;
            }); 
        }

        public static getDefaultKit(): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitMetaData().then(function (metaData: ITacoKitMetaData): Q.Promise<string> {
                var kits: IKitMetadata = metaData.kits;
                Object.keys(kits).forEach(function (kitId: string): Q.Promise<string> {
                    // Get the kit for which the default attribute is set to true
                    if (kits[kitId].default) {
                        deferredPromise.resolve(kitId);
                        return deferredPromise.promise;
                    }
                });
                return deferredPromise.promise;
            }); 
        }

        public static getDefaultKitId(): string {
            if (KitHelper.defaultKitId) {
                return KitHelper.defaultKitId;
            }
            else {
                KitHelper.getKitMetaData().then(function (metaData: ITacoKitMetaData): string {
                    var kits: IKitMetadata = metaData.kits;
                    Object.keys(kits).forEach(function (kitId: string): string {
                        // Get the kit for which the default attribute is set to true
                        if (kits[kitId].default) {
                            KitHelper.defaultKitId = kitId;
                            return KitHelper.defaultKitId;
                        }
                    });
                    return KitHelper.defaultKitId;
                });
            }
            
        }

        public static getCordovaCliForDefaultKit(): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitMetaData().then(function (metaData: ITacoKitMetaData): Q.Promise<string> {
                var kits: IKitMetadata = metaData.kits;
                Object.keys(kits).forEach(function (kitId: string): Q.Promise<string> {
                    // Get the kit for which the default attribute is set to true
                    if (kits[kitId].default) {
                        deferredPromise.resolve(kits[kitId].cli);
                        return deferredPromise.promise;
                    }
                });
                return deferredPromise.promise;
            }); 
        }

        public static getCordovaCliForKit(kitId: string): Q.Promise<string> {
            var deferredPromise: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitMetaData().then(function (metaData: ITacoKitMetaData): Q.Promise<string> {
                var kits: IKitMetadata = metaData.kits;
                deferredPromise.resolve(kits[kitId].cli);
                return deferredPromise.promise;
            });
        }

        public static getPlatformOverridesForKit(kitId: string): Q.Promise<IPlatformOverrideMetaData> {
            var kits: IKitMetadata = null;
            var deferredPromise: Q.Deferred<IPlatformOverrideMetaData> = Q.defer<IPlatformOverrideMetaData>();
            return KitHelper.getKitMetaData()
                .then(function (metaData: ITacoKitMetaData): Q.Promise<IPlatformOverrideMetaData> {
                    kits = metaData.kits;
                    if (kits[kitId] && kits[kitId].platforms) {
                    // Found the specified kit
                        deferredPromise.resolve(kits[kitId].platforms);
                } else {
                    // Error, no kit matching the kit id
                    deferredPromise.reject("command.create.kitNotFound");
                }

                return deferredPromise.promise;
            });
        }

        public static getPluginOverridesForKit(kitId: string): Q.Promise<IPluginOverrideMetaData> {
            var kits: IKitMetadata = null;
            var deferredPromise: Q.Deferred<IPluginOverrideMetaData> = Q.defer<IPluginOverrideMetaData>();
            return KitHelper.getKitMetaData()
                .then(function (metaData: ITacoKitMetaData): Q.Promise<IPluginOverrideMetaData> {
                    kits = metaData.kits;
                    if (kits[kitId] && kits[kitId].plugins) {
                    // Found the specified kit
                        deferredPromise.resolve(kits[kitId].plugins);
                } else {
                    // Error, no kit matching the kit id
                    deferredPromise.reject("command.create.kitNotFound");
                }

                return deferredPromise.promise;
            });
        }


        public static isKitValid(kitId: string): Q.Promise<boolean> {
            var deferredPromise: Q.Deferred<boolean> = Q.defer<boolean>();
            return KitHelper.getKitMetaData().then(function (metaData: ITacoKitMetaData): Q.Promise<boolean> {
                var kits: IKitMetadata = metaData.kits;
                deferredPromise.resolve(kits[kitId] && kits[kitId].deprecated? true: false);
                return deferredPromise.promise;
            });
            deferredPromise.resolve(false);
            return deferredPromise.promise;
        }

        public static getTemplateInfo(kitId: string, templateId: string): Q.Promise<ITemplateInfo> {
            var templateMetaData: ITemplateMetaData = null;
            return KitHelper.getKitMetaData()
                .then(function (metaData: ITacoKitMetaData): Q.Promise<ITemplateMetaData> {
                templateMetaData = metaData.templates;

                return Q.resolve(templateMetaData);
            }).then(function (metaData: ITemplateMetaData): Q.Promise<string> {
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
                            templateInfoPromise.reject("command.create.noTypescript");
                        } else {
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
                    templateInfoPromise.reject("command.create.templateNotFound");
                }

                return templateInfoPromise.promise;
            });
        }
    }
}

export = TacoKits;