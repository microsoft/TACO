
declare module TacoUtility {
    class ResourceManager {

        constructor(resourcesDirectory: string);

        /** ...optionalArgs is only there for typings, function rest params */
        public getString(id: string, ...optionalArgs: any[]): string;

        public static ResourcesNamespace: string;
        public static LocalesKey: string;

    }
}
