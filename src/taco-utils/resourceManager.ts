/// <reference path="../typings/node.d.ts" />

import fs = require("fs");
import path = require("path");
import resourceSet = require("./resourceSet");
import ResourceSet = resourceSet.ResourceSet;

module TacoUtility {
    export class ResourceManager {

        private static DefaultLocale: string = "en";
        private resourceDirectory: string = null;
        private resources: { [lang: string]: ResourceSet } = {};

        constructor(resourcesDirectory: string) {
            this.resourceDirectory = resourcesDirectory;
        }

        public getString(id: string, ...optionalArgs: any[]): string {
            if (process.env["TACO_UNIT_TEST"]) {
                // Mock out resources for unit tests
                return id;
            }

            var locale: string = ResourceManager.getCurrentLocale();
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
                ResourceManager.DefaultLocale;
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

            var resourceFilePath = ResourceManager.getResourceFilePath(this.resourceDirectory, matchingLocale);
            this.resources[matchingLocale] = new ResourceSet(resourceFilePath);

            this.resources[locale] = this.resources[matchingLocale];
        }

        /**
         * Given a locale, walks up the locale chain and 
         * returns best matching locale based on available resource files
         */
        private getBestMatchingLocale(locale: string): string {

            var availableResources: string[] = ResourceManager.getAvailableLocales(this.resourceDirectory);
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

            return ResourceManager.DefaultLocale;
        }

        /**
         * get list of available resources in given resourcesDirectory
         */
        private static getAvailableLocales(resourcesDirectory: string): string[]{
            var availableLocales: string[] = [];
            fs.readdirSync(resourcesDirectory).forEach(function (filename: string): void {
                try {
                    if (fs.existsSync(ResourceManager.getResourceFilePath(resourcesDirectory, filename))){
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