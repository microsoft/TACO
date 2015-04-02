/// <reference path="../typings/node.d.ts" />
import fs = require ("fs");
import path = require ("path");
import tacoUtility = require ("./util-helper");
import UtilHelper = tacoUtility.UtilHelper;

module TacoUtility {
    export class ResourcesManager {
        private static Resources: { [key: string]: any; } = {};
        private static SupportedLanguages: string[] = [];
        private static DefaultLanguage: string = "en";

        public static UnitTest: boolean = false;

        /**
         * Initialize the Resource Manager
         *
         * @param {string} language The default language to look up via getString
         * @param {string} resourcesDir The location to look for resources. The expectation is that this location has subfolders such as "en" and "it-ch" which contain "resources.json"
         */
        public static init(language: string, resourcesDir: string): void {
            if (ResourcesManager.SupportedLanguages.length === 0) {
                // Initialize the resources for this package the first time we are initialized
                ResourcesManager.loadFolder(path.join(__dirname, "resources"));
            }

            ResourcesManager.loadFolder(resourcesDir);

            ResourcesManager.DefaultLanguage = ResourcesManager.bestLanguageMatchOrDefault(language);
        }

        // For unit tests
        public static teardown(): void {
            ResourcesManager.Resources = {};
            ResourcesManager.SupportedLanguages = [];
        }

        /** ...optionalArgs is only there for typings, function rest params */
        public static getString(id: string, ...optionalArgs: any[]): string {
            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return ResourcesManager.getStringForLanguage(ResourcesManager.DefaultLanguage, id, args);
        }

        /** ** ...optionalArgs is only there for typings, function rest params** */
        public static getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string {
            if (ResourcesManager.UnitTest) {
                // Mock out resources for unit tests
                return id;
            }

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

            var result: string = s;
            /*All args passed to current function:
            you can call getString('foo', 'bar', 'baz') or getString('foo',['bar', 'baz']) 
            and the utility function will extract ['bar', 'baz'] as args in both cases*/
            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            if (args) {
                for (var i: number = 0; i < args.length; i++) {
                    result = result.replace(new RegExp("\\{" + i + "\\}", "g"), args[i]);
                }
            }

            return result;
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

        private static loadFolder(resourcesDir: string): void {
            fs.readdirSync(resourcesDir).forEach(function (filename: string): void {
                try {
                    var res = ResourcesManager.loadLanguage(filename, resourcesDir);
                    if (ResourcesManager.Resources[filename.toLowerCase()]) {
                        Object.keys(res).forEach(function (key: string): void {
                            ResourcesManager.Resources[filename.toLowerCase()][key] = ResourcesManager.Resources[filename.toLowerCase()][key] || res[key];
                        });
                    } else {
                        ResourcesManager.Resources[filename.toLowerCase()] = res;
                    }

                    ResourcesManager.SupportedLanguages.push(filename.toLowerCase());
                } catch (e) {
                    // Folder was not a valid resource; ignore it
                }
            });
        }

        private static loadLanguage(language: string, resourcesDir: string): any {
            var resourcesPath = path.join(resourcesDir, language, "resources.json");
            return require(resourcesPath);
        }
    }

    export module ResourcesManager {
        export interface IResources {
            getStringForLanguage: (req: any, id: string, ...optionalArgs: any[]) => string;
        }
    }
}

export = TacoUtility;