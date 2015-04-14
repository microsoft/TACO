
// To add more classes, make sure that they define themselves in the TacoUtility namespace,
// include a reference to the d.ts file that is generated (as above), and make sure
// to remove the "export =" and any imports in the file. If it refers to external types,
// ensure that it has a /// <reference> to the relevant file, and that it uses the same name
// that file does for the type's namespace. See util-helper for how it uses Q

declare module TacoKits {
    interface IPluginOverrideMetadata {
        [pluginId: string]: {
            name: string;
            version: string;
            src: string;
            platforms: string[];
        };
    }

    interface IPlatformOverrideMetadata {
        [platformName: string]: {
            version: string;
            src: string;
        };
    }

    interface ITemplateOverrideInfo {
        kitId: string;
        templateInfo: ITemplateInfo;
    }

    interface ITemplateInfo {
        [id: string]: {
            name: string;
            url: string;
        };
    }

    interface ITemplateMetadata {
        [kitName: string]: ITemplateInfo;
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
        plugins?: IPluginOverrideMetadata[];
        platforms?: IPlatformOverrideMetadata[];
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

    interface ITacoKitMetadata {
        plugins?: IPluginMetadata;
        kits?: IKitMetadata;
        templates?: ITemplateMetadata;
    }

    class KitHelper {
        private static kitMetadata: ITacoKitMetadata;
        private static kitFileName: string;
        private static defaultKitId: string;

        public static init(locale: string): void;

        public static getKitMetadata(): Q.Promise<ITacoKitMetadata>;

        public static getDefaultKit(): Q.Promise<string>;

        public static getValidCordovaCli(kitId: string): Q.Promise<string>;

        public static getPlatformOverridesForKit(kitId: string): Q.Promise<IPlatformOverrideMetadata>;

        public static getPluginOverridesForKit(kitId: string): Q.Promise<IPluginOverrideMetadata>;

        public static isKitDeprecated(kitId: string): Q.Promise<boolean>;

        public static getTemplateOverrideInfo(kitId: string, templateId: string): Q.Promise<ITemplateOverrideInfo>;
    }
}

declare module "taco-kits" {
    export = TacoKits;
}
