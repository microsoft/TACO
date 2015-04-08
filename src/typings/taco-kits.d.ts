
// To add more classes, make sure that they define themselves in the TacoUtility namespace,
// include a reference to the d.ts file that is generated (as above), and make sure
// to remove the "export =" and any imports in the file. If it refers to external types,
// ensure that it has a /// <reference> to the relevant file, and that it uses the same name
// that file does for the type's namespace. See util-helper for how it uses Q

declare module TacoKits {
    interface IPluginOverrideMetaData {
        [pluginId: string]: {
            name: string;
            version: string;
            src: string;
            platforms: string[];
        };
    }

    interface IPlatformOverrideMetaData {
        [platformName: string]: {
            version: string;
            src: string;
        };
    }

    interface ITemplateInfo {
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

    interface IKitInfo {
        kitId: string;
        cli: string;
        tacoMin: string;
        name: string;
        description?: string;
        releaseNotesUri?: string;
        deprecated?: boolean;
        deprecatedReasonUri?: boolean;
        default?: boolean;
        plugins?: IPluginOverrideMetaData[];
        platforms?: IPlatformOverrideMetaData[];
    }

    interface IKitMetadata {
        [kitId: string]: IKitInfo;
    }

    interface IPluginInfo {
        pluginId: string;
        name: string;
        description?: string;
        platforms?: string[];
    }

    interface IPluginMetadata {
        [pluginId: string]: IPluginInfo;
    }

    interface ITacoKitMetaData {
        plugins?: IPluginMetadata;
        kits?: IKitMetadata;
        templates?: ITemplateMetaData;
    }

    class KitHelper {
        private static kitMetaData: ITacoKitMetaData;
        private static kitFileName: string;

        public static getKitMetaData(): Q.Promise<ITacoKitMetaData>;

        public static getKitInfo(kitId: string): Q.Promise<IKitInfo>;

        public static getAllPluginsInfo(): Q.Promise<IPluginMetadata>;

        public static getDefaultKit(): Q.Promise<string>;

        public static getCordovaCliForDefaultKit(): Q.Promise<string>;

        public static getCordovaCliForKit(kitId: string): Q.Promise<string>;

        public static getPlatformOverrideForKit(kit: string): Q.Promise<string>;

        public static getPluginOverrideForKit(kit: string): Q.Promise<string>;


        public static isKitValid(kitId: string): Q.Promise<boolean>;

        public static getTemplateInfo(kitId: string, templateId: string): Q.Promise<ITemplateInfo>;
    }
}

declare module "taco-kits" {
    export = TacoKits;
}
