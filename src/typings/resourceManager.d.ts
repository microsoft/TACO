
declare module TacoUtility {
    class ResourceManager {

        constructor(resourcesDir: string, language?: string);
        /** ...optionalArgs is only there for typings, function rest params */
        getString(id: string, ...optionalArgs: any[]): string;
        /** ** ...optionalArgs is only there for typings, function rest params** */
        getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string;
        static getBestAvailableLocale(availableLocales: string[], inputLocales?: string[]): string;
    }
}
