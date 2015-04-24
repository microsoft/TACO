/// <reference path="../typings/node.d.ts" />

import fs = require("fs");
import path = require("path");
import resourceSet = require("./resourceSet");
import ResourceSet = resourceSet.ResourceSet;

module TacoUtility {
    export class ResourceManagerBase {

        private static DefaultLocale: string = "en";
        private resources: { [lang: string]: ResourceSet } = {};

        protected get ResourcesDirectory(): string {
            throw new Error("foo");
        }

        public getString(id: string, ...optionalArgs: any[]): string {
            if (process.domain && process.domain.UnitTest) {
                // Mock out resources for unit tests
                return id;
            }

            var locale: string = ResourceManagerBase.getCurrentLocale();
            this.EnsureResourceSet(locale);
            return this.resources[locale].getString(id, optionalArgs);
        }

        /*
         * Look at domain locale otherwise fallback to LANG environment variable
         * if both of them are not specified fallback to DefaultLocale ("en")
         */
        private static getCurrentLocale(): string {
            return (process.domain && process.domain.lang) ||
                process.env.LANG ||
                ResourceManagerBase.DefaultLocale;
        }

        /*
         * Given a locale, reads up the best matching available resource files
         * and associate the locale with corresponding ResourceSet
         */
        private EnsureResourceSet(locale: string): void {
            if (this.resources[locale]) {
                return;
            }

            var matchingLocale = this.getBestMatchingLocale(locale);
            if (this.resources[matchingLocale]) {
                this.resources[locale] = this.resources[matchingLocale];
                return;
            }

            var resourceFilePath = ResourceManagerBase.getResourceFilePath(this.ResourcesDirectory, matchingLocale);
            this.resources[matchingLocale] = new ResourceSet(resourceFilePath);

            this.resources[locale] = this.resources[matchingLocale];
        }

        /**
         * Given a locale, walks up the locale chain and 
         * returns best matching locale based on available resource files
         */
        private getBestMatchingLocale(locale: string): string {

            var availableResources: string[] = ResourceManagerBase.getAvailableLocales(this.ResourcesDirectory);
            if (availableResources.indexOf(locale) >= 0) {
                return locale;
            }

            // get parent language
            if (locale.indexOf("-") > 0) {
                locale = locale.split("-")[0]; 
                if (availableResources.indexOf(locale) >= 0) {
                    return locale;
                }
            }

            return ResourceManagerBase.DefaultLocale;
        }

        /**
         * get list of available resources in given resourcesDirectory
         */
        private static getAvailableLocales(resourcesDirectory: string): string[]{
            var availableLocales: string[] = [];
            fs.readdirSync(resourcesDirectory).forEach(function (filename: string): void {
                try {
                    if (fs.existsSync(ResourceManagerBase.getResourceFilePath(resourcesDirectory, filename))){
                        availableLocales.push(filename);
                    }
                } catch (e) {
                    // Folder was not a valid resource; ignore it
                }
            });

            return availableLocales;
        }

        private static getResourceFilePath(resourcesDirectory: string, lang: string): string {
            return path.join(resourcesDirectory, lang, "resources.json");
        }
    }
}

export = TacoUtility;