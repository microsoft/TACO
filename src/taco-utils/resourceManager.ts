/// <reference path="../typings/node.d.ts" />
import fs = require ("fs");
import path = require ("path");
import tacoUtility = require ("./utilHelper");
import UtilHelper = tacoUtility.UtilHelper;

module TacoUtility {
    export class ResourceManager {
        private static DefaultLanguage: string = "en";
        private resources: { [key: string]: any; } = {};
        private supportedLanguages: string[] = [];

        /**
         * Initialize the Resource Manager
         *
         * @param {string} language The default language to look up via getString
         * @param {string} resourcesDir The location to look for resources. The expectation is that this location has subfolders such as "en" and "it-ch" which contain "resources.json"
         */
        constructor(resourcesDir: string, language: string) {
            this.loadFolder(resourcesDir);
            ResourceManager.DefaultLanguage = this.bestLanguageMatchOrDefault(language);
        }

        /** ...optionalArgs is only there for typings, function rest params */
        public getString(id: string, ...optionalArgs: any[]): string {
            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return this.getStringForLanguage(ResourceManager.DefaultLanguage, id, args);
        }

        /** ** ...optionalArgs is only there for typings, function rest params** */
        public getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string {
            if (process.env["TACO_UNIT_TEST"]) {
                // Mock out resources for unit tests
                return id;
            }

            if (!this.resources) {
                throw new Error("Resources have not been loaded");
            }

            var lang = this.bestLanguageMatchOrDefault(requestOrAcceptLangs);

            var s = this.resources[lang][id];
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

        private static loadLanguage(language: string, resourcesDir: string): any {
            var resourcesPath = path.join(resourcesDir, language, "resources.json");
            return require(resourcesPath);
        }

        private bestLanguageMatchOrDefault(requestOrAcceptLangs: any): string {
            var lang = this.bestLanguageMatch(requestOrAcceptLangs);
            if (!this.resources[lang]) {
                lang = ResourceManager.DefaultLanguage;
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
        private bestLanguageMatch(requestOrAcceptLangs: any): string {
            if (Array.isArray(requestOrAcceptLangs)) {
                return this.getBestLanguageFromArray(requestOrAcceptLangs);
            }

            var langString: string;
            if (!requestOrAcceptLangs) {
                return ResourceManager.DefaultLanguage;
            } else if (typeof requestOrAcceptLangs === "string") {
                langString = requestOrAcceptLangs;
            } else if (requestOrAcceptLangs.headers) {
                langString = requestOrAcceptLangs.headers["accept-language"] || "";
            } else {
                throw new Error("Unsupported type of argument for acceptLangs: " + (typeof requestOrAcceptLangs));
            }

            return this.getBestLanguageFromArray(langString.split(",").map(function (l: string): string { return l.split(";")[0]; }));
        }

        /**
         * Given a list of languages, we try to find an exact match if we can, and we fall back to a primary language otherwise.
         *  e.g. "fr-CA" will use "fr-CA" resources if present, but will fall back to "fr" resources if they are available
         */
        private getBestLanguageFromArray(acceptLangs: string[]): string {
            var primaryLanguageMatch: string = null;
            for (var i: number = 0; i < acceptLangs.length; ++i) {
                var lang: string = acceptLangs[i].toLowerCase();
                var primaryLang = lang.split("-")[0];
                if (this.supportedLanguages.indexOf(lang) !== -1) {
                    // Exact match on full language header, which could include the region
                    return lang;
                }

                if (this.supportedLanguages.indexOf(primaryLang) !== -1) {
                    // Match on primary language (e.g. it from it-CH). We may find a better match later, so continue looking.
                    primaryLanguageMatch = primaryLang;
                }
            }

            return primaryLanguageMatch;
        }

        private loadFolder(resourcesDir: string): void {
            var self: ResourceManager = this;
            fs.readdirSync(resourcesDir).forEach(function (filename: string): void {
                try {
                    var res = ResourceManager.loadLanguage(filename, resourcesDir);
                    if (self.resources[filename.toLowerCase()]) {
                        Object.keys(res).forEach(function (key: string): void {
                            self.resources[filename.toLowerCase()][key] = self.resources[filename.toLowerCase()][key] || res[key];
                        });
                    } else {
                        self.resources[filename.toLowerCase()] = res;
                    }

                    self.supportedLanguages.push(filename.toLowerCase());
                } catch (e) {
                    // Folder was not a valid resource; ignore it
                }
            });
        }
    }
}

export = TacoUtility;