/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */


declare module TacoUtility {
    class ResourceManager {

        constructor(resourcesDir: string, language?: string);
        /** ...optionalArgs is only there for typings, function rest params */
        getString(id: string, ...optionalArgs: any[]): string;
        /** ** ...optionalArgs is only there for typings, function rest params** */
        getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string;
        /** Logs a message generated from a resource string */
        log(id: string, ...optionalArgs: any[]): void;

        static getBestAvailableLocale(availableLocales: string[], inputLocales?: string[]): string;
    }
}
