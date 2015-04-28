/// <reference path="../typings/continuation-local-storage.ts" />
/// <reference path="../typings/node.d.ts" />

import cls = require("continuation-local-storage");
import fs = require("fs");
import path = require("path");

import resourceSet = require("./resourceSet");
import tacoUtility = require("./utilHelper");

import ResourceSet = resourceSet.ResourceSet;
import UtilHelper = tacoUtility.UtilHelper;

module TacoUtility {
    export class ResourceManager {

        public static ResourcesNamespace = "resources";
        public static LocalesKey = "locales";

        private static DefaultLocale: string = "en";
        private resourceDirectory: string = null;
        private resources: { [lang: string]: ResourceSet } = {};
        private availableLocales: string[] = null;

        constructor(resourcesDirectory: string) {
            this.resourceDirectory = resourcesDirectory;
        }

        public getString(id: string, ...optionalArgs: any[]): string {
            if (process.env["TACO_UNIT_TEST"]) {
                // Mock out resources for unit tests
                return id;
            }

            var locale: string = null;

            var session: cls.Session = cls.getNamespace(ResourceManager.ResourcesNamespace);
            if (session) {
                var locales: string[] = session.get(ResourceManager.LocalesKey);
                locale = this.getBestMatchingLocale(locales);
            }

            // Look at LANG environment variable or fallback to DefaultLocale ("en")
            if (!locale && process.env.LANG) {
                locale = this.getBestMatchingLocale([process.env.LANG]);
            }

            if (!locale && process.env.LANG) {
                locale = this.getBestMatchingLocale([ResourceManager.DefaultLocale]);
            }

            locale = locale || ResourceManager.DefaultLocale;

            if (!this.resources[locale]) {
                var resourceFilePath = ResourceManager.getResourceFilePath(this.resourceDirectory, locale);
                this.resources[locale] = new ResourceSet(resourceFilePath);
            }

            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return this.resources[locale].getString(id, args);
        }


        /**
         * Given a locale, walks up the locale chain and 
         * returns best matching locale based on available resource files
         */
        private getBestMatchingLocale(locales: string[]): string {
            var parentLocaleMatch: string = null;
            var supportedLocales: string[] = this.getAvailableLocales();

            for (var i: number = 0; i < locales.length; ++i) {
                var locale: string = locales[i].toLowerCase();
                if (supportedLocales.indexOf(locale) !== -1) {
                    // Exact match on full language header, which could include the region
                    return locale;
                }

                var parentLocale = locale.split("-")[0];
                if (supportedLocales.indexOf(parentLocale) !== -1) {
                    // Match on primary language (e.g. it from it-CH). We may find a better match later, so continue looking.
                    parentLocaleMatch = parentLocale;
                }
            }

            return parentLocaleMatch;
        }

        /**
         * get list of available resources in given resourcesDirectory
         */
        private getAvailableLocales(): string[] {
            if (this.availableLocales == null) {
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

        private static getResourceFilePath(resourcesDirectory: string, lang: string): string {
            return path.join(resourcesDirectory, lang, "resources.json");
        }
    }
}

export = TacoUtility;