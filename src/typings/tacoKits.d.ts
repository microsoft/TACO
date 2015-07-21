/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

// Typings for taco-kits package
declare module TacoKits {
    // Basic interface for a KitHelper, for mocking purposes
    interface IKitHelper {
        /**
         *   Returns a promise which is either rejected with a failure to parse or find kits metadata file
         *   or resolved with the parsed metadata
         */
        getKitMetadata?: () => Q.Promise<ITacoKitMetadata>;

        /**
         *   Returns a promise which is either rejected with a failure to find the specified kit
         *   or resolved with the information regarding the kit
         */
        getKitInfo?: (kitId: string) => Q.Promise<IKitInfo>;

        /**
         *  Returns a promise resolved with the Id of the default kit or rejected with error
         *  Note that the default kit is one with default attribute set to 'true'
         */
        getDefaultKit?: () => Q.Promise<string>;

        /**
         *   Returns a promise resolved by a valid cordova Cli for the kitId
         *   If kitId param is a valid {kitId}, returns the cordova Cli used by the kit with id {kitId}
         *   Otherwise, returns the cordovaCli used by the default kit
         */
        getValidCordovaCli?: (kitId: string) => Q.Promise<string>;
        getCordovaCliForKit?: (kitId: string) => Q.Promise<string>;

        /**
         *  Returns a promise resolved with the platform override info for the kit
         */
        getPlatformOverridesForKit?: (kitId: string) => Q.Promise<IPlatformOverrideMetadata>;

        /**
         *  Returns a promise resolved with the plugin override info for the kit
         */
        getPluginOverridesForKit?: (kitId: string) => Q.Promise<IPluginOverrideMetadata>;

        /**
         *   Returns a promise resolved by the template override information for the specified kit
         *   If there is an override for {kitId} -> returns the template override info for the {templateId}
         *   Else -> returns the default template information with id {templateId}
         */
        getTemplateOverrideInfo?: (kitId: string, templateId: string) => Q.Promise<ITemplateOverrideInfo>;

        /**
         *   Returns a promise resolved with an IKitTemplatesOverrideInfo that contains all the templates for the specified kit (or default kit if none specified)
         */
        getTemplatesForKit?:(kitId: string) => Q.Promise<IKitTemplatesOverrideInfo>;

        /**
         *   Returns a promise resolved with an ITemplateOverrideInfo[] that contains all the available templates regardless of kits
         */
        getAllTemplates?: () => Q.Promise<ITemplateOverrideInfo[]>;
        /*getTemplateOverrideInfo: (kitId: string, templateId: string) => Q.Promise<TacoKits.ITemplateOverrideInfo>;
        getTemplatesForKit: (kitId: string) => Q.Promise<TacoKits.IKitTemplatesOverrideInfo>;
        getAllTemplates?: () => Q.Promise<ITemplateOverrideInfo[]>;*/

        kitMetadataFilePath?: string;
    }

    interface IPluginOverrideInfo {
        name?: string;
        version?: string;
        src?: string;
        "supported-platforms"?: string;
    }

    interface IPlatformOverrideInfo {
        version: string;
        src?: string;
    }

    // Metadata-related interfaces
    interface IPluginOverrideMetadata {
        [pluginId: string]: IPluginOverrideInfo;
    }

    interface IPlatformOverrideMetadata {
        [platformName: string]: IPlatformOverrideInfo;
    }

    interface ITemplateOverrideInfo {
        kitId: string;
        templateId?: string;
        templateInfo: ITemplateInfo;
    }

    interface IKitTemplatesOverrideInfo {
        kitId: string;
        templates: ITemplateOverrideInfo[];
    }

    interface ITemplateInfo {
        name: string;
        url: string;
    }

    interface ITemplateMetadata {
        [kitId: string]: {
            [templateId: string]: ITemplateInfo;
        }
    }

    interface IKitInfo {
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

    interface IKitMetadata {
        [kitId: string]: IKitInfo;
    }

    interface IPluginInfo {
        name: string;
        description?: string;
        platforms?: string[];
    }

    interface IPluginMetadata {
        [pluginId: string]: IPluginInfo;
    }

    interface ITacoKitMetadata {
        plugins?: IPluginMetadata;
        kits: IKitMetadata;
        templates: ITemplateMetadata;
    }

    interface ITacoKits {
        kitHelper: IKitHelper;        
    }

    enum TacoErrorCode {
        TacoKitsExceptionInvalidKit,
        TacoKitsExceptionInvalidTemplate,
        TacoKitsExceptionKitMetadataFileMalformed,
        TacoKitsExceptionKitMetadataFileNotFound,
        TacoKitsExceptionNoCliSpecification,
        TacoKitsExceptionTypescriptNotSupported
    }
}

declare module "taco-kits" {
    export = TacoKits;
}
