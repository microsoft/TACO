/// <reference path="../typings/node.d.ts" />
import fs = require ("fs");
import path = require ("path");

module TacoUtility {
    export class ResourcesManager {
        private static Resources: { [key: string]: any; } = null;
        private static SupportedLanguages: string[] = null;
        private static DefaultLanguage: string = "en";

        /**
         * Initialize the Resource Manager
         *
         * @param {string} language The default language to look up via getString
         * @param {string} resourcesDir The location to look for resources. The expectation is that this location has subfolders such as "en" and "it-ch" which contain "resources.json"
         */
        public static init(language: string, resourcesDir: string): void {
            ResourcesManager.Resources = {};
            ResourcesManager.SupportedLanguages = [];
            fs.readdirSync(resourcesDir).forEach(function (filename: string): void {
                try {
                    ResourcesManager.Resources[filename.toLowerCase()] = ResourcesManager.loadLanguage(filename, resourcesDir);
                    ResourcesManager.SupportedLanguages.push(filename.toLowerCase());
                } catch (e) {
                    // Folder was not a valid resource; ignore it
                }
            });

            ResourcesManager.DefaultLanguage = ResourcesManager.bestLanguageMatchOrDefault(language);
        }

        // For unit tests
        public static teardown(): void {
            ResourcesManager.Resources = null;
            ResourcesManager.SupportedLanguages = null;
        }

        /** ...optionalArgs is only there for typings, function rest params */
        public static getString(id: string, ...optionalArgs: any[]): string {
            var args = ResourcesManager.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return ResourcesManager.getStringForLanguage(ResourcesManager.DefaultLanguage, id, args);
        }

        /** ** ...optionalArgs is only there for typings, function rest params** */
        public static getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string {
            if (!ResourcesManager.Resources) {
                throw new Error("Resources have not been loaded");
            }

            var lang = ResourcesManager.bestLanguageMatchOrDefault(requestOrAcceptLangs);

            var s = ResourcesManager.Resources[lang][id];
            if (!s) {
                return s;
            } else if (Array.isArray(s)) {
                // Allow longer resources strings to be specified as a list of strings, which represent multiple lines
                s = s.join("\n");
            }

            /*All args passed to current function:
            you can call getString('foo', 'bar', 'baz') or getString('foo',['bar', 'baz']) 
            and the utility function will extract ['bar', 'baz'] as args in both cases*/
            var args = ResourcesManager.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            if (args) {
                for (var i: number = 0; i < args.length; i++) {
                    s = s.replace("{" + i + "}", args[i]);
                }
            }

            return s;
        }

        private static bestLanguageMatchOrDefault(requestOrAcceptLangs: any): string {
            var lang = ResourcesManager.bestLanguageMatch(requestOrAcceptLangs);
            if (!ResourcesManager.Resources[lang]) {
                lang = ResourcesManager.DefaultLanguage;
            }

            return lang.toLowerCase();
        }

        /**
         * requestOrAcceptLangs can either be:
         * A string, with format "LangSpec[,LangSpec]*" where LangSpec is "Language[;anything]"
         *   e.g. "pl,fr-FR;q=0.3,en-US;q=0.1" is interpreted as "pl" or "fr-FR" or "en-US". Currently we ignore provided quality (q) values
         * An array, which we assume is an array of strings representing languages such as "pl" or "fr-FR"
         * A (express-style) HTTP Request object, with a headers property specifing "accept-language" in a string, as above
         * 
         * This allows us to handle simple cases of a single string, as well as more complex cases where a client specifies
         * multiple preferences.
         */
        private static bestLanguageMatch(requestOrAcceptLangs: any): string {
            if (Array.isArray(requestOrAcceptLangs)) {
                return ResourcesManager.getBestLanguageFromArray(requestOrAcceptLangs);
            }

            var langString: string;
            if (!requestOrAcceptLangs) {
                return ResourcesManager.DefaultLanguage;
            } else if (typeof requestOrAcceptLangs === "string") {
                langString = requestOrAcceptLangs;
            } else if (requestOrAcceptLangs.headers) {
                langString = requestOrAcceptLangs.headers["accept-language"] || "";
            } else {
                throw new Error("Unsupported type of argument for acceptLangs: " + (typeof requestOrAcceptLangs));
            }

            return ResourcesManager.getBestLanguageFromArray(langString.split(",").map(function (l: string): string { return l.split(";")[0]; }));
        }

        /**
         * Given a list of languages, we try to find an exact match if we can, and we fall back to a primary language otherwise.
         *  e.g. "fr-CA" will use "fr-CA" resources if present, but will fall back to "fr" resources if they are available
         */
        private static getBestLanguageFromArray(acceptLangs: string[]): string {
            var primaryLanguageMatch: string = null;
            for (var i: number = 0; i < acceptLangs.length; ++i) {
                var lang: string = acceptLangs[i].toLowerCase();
                var primaryLang = lang.split("-")[0];
                if (ResourcesManager.SupportedLanguages.indexOf(lang) !== -1) {
                    // Exact match on full language header, which could include the region
                    return lang;
                }

                if (ResourcesManager.SupportedLanguages.indexOf(primaryLang) !== -1) {
                    // Match on primary language (e.g. it from it-CH). We may find a better match later, so continue looking.
                    primaryLanguageMatch = primaryLang;
                }
            }

            return primaryLanguageMatch;
        }

        private static loadLanguage(language: string, resourcesDir: string): any {
            var resourcesPath = path.join(resourcesDir, language, "resources.json");
            return require(resourcesPath);
        }

        private static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[] {
            if (functionArguments.length <= startFrom) {
                return null;
            }

            if (Array.isArray(functionArguments[startFrom])) {
                return functionArguments[startFrom];
            }

            return Array.prototype.slice.apply(functionArguments, [startFrom]);
        }
    }
}

export = TacoUtility;