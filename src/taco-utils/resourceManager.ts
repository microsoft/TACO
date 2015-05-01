/// <reference path="../typings/node.d.ts" />

import assert = require ("assert");
import fs = require ("fs");
import path = require ("path");

import resourceSet = require ("./resourceSet");
import tacoUtility = require ("./utilHelper");

import ResourceSet = resourceSet.ResourceSet;
import UtilHelper = tacoUtility.UtilHelper;

module TacoUtility {
    export class ResourceManager {
        private static DefaultLocale: string = "en";

        private resourceDirectory: string = null;
        private resources: { [lang: string]: ResourceSet } = {};
        private availableLocales: string[] = null;
        private initialLocale: string = null

        constructor(resourcesDirectory: string, language?: string) {
            this.resourceDirectory = resourcesDirectory;
            this.initialLocale = language;
        }

        public getString(id: string, ...optionalArgs: any[]): string {
            if (process.env["TACO_UNIT_TEST"]) {
                // Mock out resources for unit tests
                return id;
            }

            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return this.getStringForLocale(this.bestLanguageMatch(this.getCurrentLocale()), id, args);
        }

        public getStringForLanguage(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]): string {
            if (process.env["TACO_UNIT_TEST"]) {
                // Mock out resources for unit tests
                return id;
            }

            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            return this.getStringForLocale(this.bestLanguageMatch(requestOrAcceptLangs), id, args);
        }

        public getStringForLocale(locale: string, id: string, ...optionalArgs: any[]): string {
            var resourceSet: ResourceSet = this.getOrCreateResourceSet(locale);
            assert.notEqual(resourceSet, null, "We should get a non-null resource set");

            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            return resourceSet.getString(id, args);
        }

        /**
         * Given an array of locales and list of available locales, walks up the locale chain and 
         * returns best matching locale based on available resources
         */
        public static getBestAvailableLocale(availableLocales: string[], inputLocales?: string[]): string {
            var locale: string = null;
            // First let's see if there is a locale set at session level 
            // on session object or env var LOCALES
            if (inputLocales) {
                locale = ResourceManager.findMatchingLocale(availableLocales, inputLocales);
            }

            // Next look at system locale, for UNIX based systems look for LANG variable
            if (!locale && process.env.LANG) {
                locale = ResourceManager.findMatchingLocale(availableLocales, [process.env.LANG]);
            }

            // Finally fallback to DefaultLocale ("en")
            if (!locale) {
                locale = ResourceManager.findMatchingLocale(availableLocales, [ResourceManager.DefaultLocale]);
            }

            return locale;
        }

        /**
         * Given availableLocales and inputLocales, find the best match
         * preferring specific locales over parent locales ("fr-FR" over "fr")
         */
        private static findMatchingLocale(availableLocales: string[], inputLocales: string[]): string {
            var bestLocale: string = null;

            for (var i: number = 0; i < inputLocales.length; ++i) {
                var locale: string = inputLocales[i].toLowerCase();
                if (availableLocales.indexOf(locale) !== -1) {
                    return locale;
                }

                var parentLocale = locale.split("-")[0];
                if (availableLocales.indexOf(parentLocale) !== -1) {
                    // Match on primary language (e.g. it from it-CH). We may find a better match later, so continue looking.
                    bestLocale = parentLocale;
                }
            }

            return bestLocale;
        }

        /**
         * self explanatory. Use LANG environment variable otherwise fall back to Default ("en")
         */
        private getCurrentLocale(): string {
            return (this.initialLocale || process.env.LANG || ResourceManager.DefaultLocale).toLowerCase();
        }

        private static getResourceFilePath(resourcesDirectory: string, lang: string): string {
            return path.join(resourcesDirectory, lang, "resources.json");
        }

        /**
         * Given current environment and the CLS session code is executing in
         * creates and returns the corresponding ResourceSet
         */
        private getOrCreateResourceSet(locale: string): ResourceSet {
            if (!this.resources[locale]) {
                this.ensureResourceSet(locale);
                return this.resources[locale];
            }

            return this.resources[locale];
        }

        /**
         * Creates a new entry in resources for provide locale
         */
        private ensureResourceSet(locale: string): void {
            assert(fs.existsSync(ResourceManager.getResourceFilePath(this.resourceDirectory, locale)));

            if (!this.resources[locale]) {
                this.resources[locale] = new ResourceSet(ResourceManager.getResourceFilePath(this.resourceDirectory, locale));
            }
        }

        /**
         * get list of available resources in given resourcesDirectory
         */
        private getAvailableLocales(): string[] {
            if (!this.availableLocales) {
                this.availableLocales = [];
                var self = this;
                fs.readdirSync(this.resourceDirectory).forEach(function (filename: string): void {
                    try {
                        if (fs.existsSync(ResourceManager.getResourceFilePath(self.resourceDirectory, filename))) {
                            self.availableLocales.push(filename);
                        }
                    } catch (e) {
                        // Folder was not a valid resource; ignore it
                    }
                });
            }

            return this.availableLocales;
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
                return ResourceManager.getBestAvailableLocale(this.getAvailableLocales(), <string[]>requestOrAcceptLangs);
            }

            var langString: string;
            if (!requestOrAcceptLangs) {
                return ResourceManager.DefaultLocale;
            } else if (typeof requestOrAcceptLangs === "string") {
                langString = requestOrAcceptLangs;
            } else if (requestOrAcceptLangs.headers) {
                langString = requestOrAcceptLangs.headers["accept-language"] || "";
            } else {
                throw new Error("Unsupported type of argument for acceptLangs: " + (typeof requestOrAcceptLangs));
            }

            var locales: string[] = langString.split(",").map(function (l: string): string { return l.split(";")[0]; });
            return ResourceManager.getBestAvailableLocale(this.getAvailableLocales(), locales);
        }
    }
}

export = TacoUtility;