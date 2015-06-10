/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/tacoUtils.d.ts" />

"use strict";
import fs = require ("fs");
import path = require ("path");
import Q = require ("q");

import resources = require ("./resources/resourceManager");
import tacoErrorCodes = require ("./tacoErrorCodes");
import errorHelper = require ("./tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import logger = tacoUtility.Logger;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;

module TacoKits {
    // Basic interface for a KitHelper, for mocking purposes
    export interface IKitHelper {
        getTemplateOverrideInfo: (kitId: string, templateId: string) => Q.Promise<TacoKits.ITemplateOverrideInfo>;
        getTemplatesForKit: (kitId: string) => Q.Promise<TacoKits.IKitTemplatesOverrideInfo>;
    }

    export interface IPluginOverrideInfo {
        name?: string;
        version?: string;
        src?: string;
        platforms?: string;
    }

    export interface IPlatformOverrideInfo {
        version: string;
        src?: string;
    }

    // Metadata-related interfaces
    export interface IPluginOverrideMetadata {
        [pluginId: string]: IPluginOverrideInfo;
    }

    export interface IPlatformOverrideMetadata {
        [platformName: string]: IPlatformOverrideInfo;
    }

    export interface ITemplateOverrideInfo {
        kitId: string;
        templateId?: string;
        templateInfo: ITemplateInfo;
    }

    export interface IKitTemplatesOverrideInfo {
        kitId: string;
        templates: ITemplateOverrideInfo[];
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

    export interface ILocalizableString {
        [lang: string]: string;
    }

    export interface IKitInfo {
        "cordova-cli": string;
        "taco-min"?: string;
        name?: string;
        description?: string;
        releaseNotesUri?: string;
        deprecated?: boolean;
        deprecatedReasonUri?: string;
        default?: boolean;
        plugins?: IPluginOverrideMetadata;
        platforms?: IPlatformOverrideMetadata;
    }

    export interface IKitMetadata {
        [kitId: string]: IKitInfo;
    }

    export interface IPluginInfo {
        name: string;
        description?: string;
        platforms?: string[];
    }

    export interface IPluginMetadata {
        [pluginId: string]: IPluginInfo;
    }

    export interface ITacoKitMetadata {
        plugins?: IPluginMetadata;
        kits: IKitMetadata;
        templates: ITemplateMetadata;
    }

    /**
     *   KitHelper class exports methods for parsing the kit metadata file (TacoKitMetaData.json)
     */
    export class KitHelper {
        private static KitMetadata: ITacoKitMetadata;
        private static TsTemplateId: string = "typescript";
        private static DefaultKitId: string;
        private static KitFileName: string = "TacoKitMetadata.json";
        private static KitDesciptionSuffix: string = "-desc";
        private static defaultTemplateKitOverride: string = "default";

         /*
          * The following member is public static to expose access to automated tests
          */
        public static KitMetadataFilePath: string;

        /**
         *   Returns a promise which is either rejected with a failure to parse or find kits metadata file
         *   or resolved with the parsed metadata
         */
        public static getKitMetadata(): Q.Promise<ITacoKitMetadata> {
            if (KitHelper.KitMetadata) {
                return Q(KitHelper.KitMetadata);
            }
            
            if (!KitHelper.KitMetadataFilePath) {
                KitHelper.KitMetadataFilePath = path.resolve(__dirname, KitHelper.KitFileName);
            }

            try {
                if (!fs.existsSync(KitHelper.KitMetadataFilePath)) {
                    return Q.reject<ITacoKitMetadata>(errorHelper.get(TacoErrorCodes.TacoKitsExceptionKitMetadataFileNotFound));
                }

                KitHelper.KitMetadata = require(KitHelper.KitMetadataFilePath);
                return Q(KitHelper.KitMetadata);
            } catch (e) {
                return Q.reject<ITacoKitMetadata>(errorHelper.get(TacoErrorCodes.TacoKitsExceptionKitMetadataFileMalformed));
            }
        }

        /**
         *   Returns a promise which is either rejected with a failure to find the specified kit
         *   or resolved with the information regarding the kit
         */
        public static getKitInfo(kitId: string): Q.Promise<IKitInfo> {
            var kits: IKitMetadata = null;
            var deferred: Q.Deferred<IKitInfo> = Q.defer<IKitInfo>();
            return KitHelper.getKitMetadata().then(function (metadata: ITacoKitMetadata): Q.Promise<IKitInfo> {
                kits = metadata.kits;
                if (kitId && kits && kits[kitId]) {
                    kits[kitId].name = resources.getString(kitId);
                    kits[kitId].description = resources.getString(kitId + KitHelper.KitDesciptionSuffix);
                    deferred.resolve(kits[kitId]);
                } else {
                    // Error, empty kitId or no kit matching the kit id
                    deferred.reject(errorHelper.get(TacoErrorCodes.TacoKitsExceptionInvalidKit, kitId));
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
                if (kitInfo.plugins) {
                    deferred.resolve(kitInfo.plugins);
                } else {
                    deferred.resolve(null);
                }

                return deferred.promise;
            });
        }

        /**
         *   Returns a promise resolved with an IKitTemplatesOverrideInfo that contains all the templates for the specified kit (or default kit if none specified)
         */
        public static getTemplatesForKit(kitId: string): Q.Promise<IKitTemplatesOverrideInfo> {
            var kit: string = null;
            var templates: ITemplateMetadata = null;

            return KitHelper.getTemplateMetadata()
                .then(function (templateMetadata: ITemplateMetadata): Q.Promise<string> {
                    templates = templateMetadata;

                    return kitId ? Q.resolve(kitId) : KitHelper.getDefaultKit();
                })
                .then(function (kitId: string): Q.Promise<IKitInfo> {
                    kit = kitId;

                    // Try to get the kit info of the specified kit; we won't do anything with it, but it will throw an error if the kit is invalid
                    return KitHelper.getKitInfo(kit);
                })
                .then(function (): Q.Promise<IKitTemplatesOverrideInfo> {
                    var templatesForKit: { [templateId: string]: ITemplateInfo } = null;
                    var templateList: ITemplateOverrideInfo[] = [];
                    var kitOverride: string = kit;

                    if (!templates[kitOverride]) {
                        kitOverride = KitHelper.defaultTemplateKitOverride;
                    }

                    templatesForKit = templates[kitOverride];

                    for (var templateId in templatesForKit) {
                        if (templatesForKit.hasOwnProperty(templateId)) {
                            var templateOverrideInfo: ITemplateOverrideInfo = {
                                kitId: kitOverride,
                                templateId: templateId,
                                templateInfo: templatesForKit[templateId]
                            };

                            templateOverrideInfo.templateInfo.name = KitHelper.getLocalizedTemplateName(kitOverride, templateId);
                            templateList.push(templateOverrideInfo);
                        }
                    }

                    var kitTemplatesOverrideInfo: IKitTemplatesOverrideInfo = {
                        kitId: kitOverride,
                        templates: templateList
                    };

                    return Q.resolve(kitTemplatesOverrideInfo);
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
            var templateOverrideInfo: ITemplateOverrideInfo = null;

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
                            templateOverrideInfo = KitHelper.createTemplateOverrideInfo(kitId, templates[kitId][templateId]);

                            // Properly assign the localized template name
                            templateOverrideInfo.templateInfo.name = KitHelper.getLocalizedTemplateName(kitId, templateId);

                            // Convert the url from relative to absolute local path
                            templateOverrideInfo.templateInfo.url = path.resolve(__dirname, templateOverrideInfo.templateInfo.url);
                            deferred.resolve(templateOverrideInfo);
                        } else {
                            // Error, the kit override does not define the specified template id
                            if (templateId === KitHelper.TsTemplateId) {
                                // We have a special error message for typescript
                                deferred.reject(errorHelper.get(TacoErrorCodes.TacoKitsExceptionTypescriptNotSupported));
                            } else {
                                deferred.reject(errorHelper.get(TacoErrorCodes.TacoKitsExceptionInvalidTemplate, templateId));
                            }
                        }
                    } else if (templates[KitHelper.defaultTemplateKitOverride][templateId]) {
                        // Found a default template matching the specified template id
                        templateOverrideInfo = KitHelper.createTemplateOverrideInfo(KitHelper.defaultTemplateKitOverride, templates[KitHelper.defaultTemplateKitOverride][templateId]);

                        // Properly assign the localized template name
                        templateOverrideInfo.templateInfo.name = KitHelper.getLocalizedTemplateName(KitHelper.defaultTemplateKitOverride, templateId);

                        // Convert the url from relative to absolute local path
                        templateOverrideInfo.templateInfo.url = path.resolve(__dirname, templateOverrideInfo.templateInfo.url);
                        deferred.resolve(templateOverrideInfo);
                    } else {
                        // Error, no template matching the specified template id
                        deferred.reject(errorHelper.get(TacoErrorCodes.TacoKitsExceptionInvalidTemplate, templateId));
                    }

                    return deferred.promise;
                });
        }

        /**
         *  Returns a promise resolved with the platform override info for the kit
         */
        public static getPlatformOverridesForKit(kitId: string): Q.Promise<IPlatformOverrideMetadata> {
            var deferred: Q.Deferred<IPlatformOverrideMetadata> = Q.defer<IPlatformOverrideMetadata>();
            return KitHelper.getKitInfo(kitId).then(function (kitInfo: IKitInfo): Q.Promise<IPlatformOverrideMetadata> {
                if (kitInfo.platforms) {
                    deferred.resolve(kitInfo.platforms);
                } else {
                    deferred.resolve(null);
                }

                return deferred.promise;
            });
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
            } else {
                return KitHelper.getCordovaCliForDefaultKit();
            }
        }

        /**
         *  Returns a promise resolved with the Id of the default kit or rejected with error
         *  Note that the default kit is one with default attribute set to 'true'
         */
        public static getDefaultKit(): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            if (KitHelper.DefaultKitId) {
                deferred.resolve(KitHelper.DefaultKitId);
                return deferred.promise;
            } else {
                return KitHelper.getKitMetadata().then(function (metadata: ITacoKitMetadata): Q.Promise<string> {
                    var kits: IKitMetadata = metadata.kits;
                    Object.keys(kits).some(function (kitId: string): boolean {
                        // Get the kit for which the default attribute is set to true
                        if (kits[kitId].default) {
                            KitHelper.DefaultKitId = kitId;
                            deferred.resolve(kitId);
                            return true;
                        }
                    });
                    return deferred.promise;
                });
            }
        }

        /**
         * Builds an ITemplateOverrideInfo from a kit id and a ITemplateInfo. The ITemplateInfo is deep copied to make sure modifications
         * to the ITemplateOverrideInfo do not affect the provided ITemplateInfo.
         */
        private static createTemplateOverrideInfo(kit: string, template: ITemplateInfo): ITemplateOverrideInfo {
            var templateOverrideInfo: ITemplateOverrideInfo = {
                kitId: kit,
                templateInfo: {
                    name: "",
                    url: ""
                }
            };

            // Deep copy the provided ITemplateInfo to the returned override object. Since we know ITemplateInfo only contains strings,
            // and are relatively small, it is safe to deep copy via JSON serialization
            templateOverrideInfo.templateInfo = JSON.parse(JSON.stringify(template));

            return templateOverrideInfo;
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
         *   Returns a promise which is either rejected with a failure to find the Cordova Cli
         *   attribute for the kit or resolved with the Cli attribute found in the matadata file
         */
        private static getCordovaCliForKit(kitId: string): Q.Promise<string> {
            var deferred: Q.Deferred<string> = Q.defer<string>();
            return KitHelper.getKitInfo(kitId).then(function (kitInfo: IKitInfo): Q.Promise<string> {
                if (kitInfo["cordova-cli"]) {
                    deferred.resolve(kitInfo["cordova-cli"]);
                } else {
                    deferred.reject(errorHelper.get(TacoErrorCodes.TacoKitsExceptionNoCliSpecification, kitId));
                }

                return deferred.promise;
            });
        }

        /**
         *   Returns the template metadata for all the kits from the TacoKitMetadata.json file
         */
        private static getTemplateMetadata(): Q.Promise<ITemplateMetadata> {
            var deferred: Q.Deferred<ITemplateMetadata> = Q.defer<ITemplateMetadata>();
            return KitHelper.getKitMetadata().then(function (metadata: ITacoKitMetadata): Q.Promise<ITemplateMetadata> {
                var templates = metadata.templates;
                if (templates) {
                    deferred.resolve(templates);
                } else {
                    // There definitely should be a templates node in the kit metadata
                    return Q.reject<ITemplateMetadata>(errorHelper.get(TacoErrorCodes.TacoKitsExceptionKitMetadataFileMalformed));
                }

                return deferred.promise;
            });
        }

        private static getLocalizedTemplateName(kitId: string, templateId: string): string {
            return resources.getString(kitId + "_" + templateId);
        }
    }

    /// <disable code="SA1301" justification="We are exporting classes" />
    export var TacoErrorCode = TacoErrorCodes;
    /// <enable code="SA1301" />
}

export = TacoKits;
