/// <reference path="../typings/continuation-local-storage.d.ts" />
/// <reference path="../typings/node.d.ts" />

import assert = require("assert");
import fs = require ("fs");
import path = require ("path");

import clsSessionManager = require("./clsSessionManager");
import resourceSet = require("./resourceSet");
import tacoUtility = require("./utilHelper");

import ResourceSet = resourceSet.ResourceSet;
import UtilHelper = tacoUtility.UtilHelper;

module TacoUtility {
    export class ResourceManager {

        public static LocalesKey: string = "locales";

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

            var resourceSet: ResourceSet = this.getOrCreateResourceSet();
            assert.notEqual(resourceSet, null, "We should get a non-null resource set");

            var args = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return resourceSet.getString(id, args);
        }

        /**
         * Given an array of locales and list of available locales, walks up the locale chain and 
         * returns best matching locale based on available resources
         */
        public static getBestAvailableLocale(availableLocales: string[], inputLocales?: string[]): string {

            return (inputLocales && ResourceManager.findMatchingLocale(availableLocales, inputLocales)) ||
                (process.env.LANG && ResourceManager.findMatchingLocale(availableLocales, [process.env.LANG])) ||
                ResourceManager.findMatchingLocale(availableLocales, [ResourceManager.DefaultLocale]);
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
         * Given current environment and the CLS session code is executing in
         * creates and returns the corresponding ResourceSet
         */
        private getOrCreateResourceSet(): ResourceSet {

            // Scenario 1: getString is called in context of a web request or under a CLS session
            // get accepetable locales set on session
            var locales: string[] = clsSessionManager.ClsSessionManager.GetCurrentTacoSessionVariable(ResourceManager.LocalesKey);
            if (locales && locales.length > 0) {

                // intersect the list with the available resouces and find the best matching one
                var bestLocale: string = ResourceManager.getBestAvailableLocale(this.getAvailableLocales(), locales);

                this.EnsureResourceSet(bestLocale);
                return this.resources[bestLocale];

            } else {

                var currentLocale: string = ResourceManager.getCurrentLocale().toLowerCase();

                // if current locale is fr-FR and we find en is the best available resource set for "fr-FR"
                // we will create this mapping now, to avoid second lookup for future requests
                if (!this.resources[currentLocale]) {

                    var matchingLocale: string = ResourceManager.getBestAvailableLocale(this.getAvailableLocales());
                    this.EnsureResourceSet(matchingLocale);

                    this.resources[currentLocale] = this.resources[matchingLocale];
                    return this.resources[currentLocale];
                }

                return this.resources[currentLocale];
            }
        }


        /**
         * Creates a new entry in resources for provide locale
         */
        private EnsureResourceSet(locale: string): void {

            assert(fs.existsSync(ResourceManager.getResourceFilePath(this.resourceDirectory, locale)));

            if (!this.resources[locale]) {
                this.resources[locale] = new ResourceSet(ResourceManager.getResourceFilePath(this.resourceDirectory, locale));
            }
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

        /**
         * self explanatory. Use LANG environment variable otherwise fall back to Default ("en")
         */
        private static getCurrentLocale(): string {
            return process.env.LANG || ResourceManager.DefaultLocale;
        }

        private static getResourceFilePath(resourcesDirectory: string, lang: string): string {
            return path.join(resourcesDirectory, lang, "resources.json");
        }
    }
}

export = TacoUtility;