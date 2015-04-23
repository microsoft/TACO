/// <reference path="../typings/node.d.ts" />
import fs = require("fs");
import path = require("path");
import resourceSet = require("./resourceSet");
import ResourceSet = resourceSet.ResourceSet;

module TacoUtility {
    export class ResourceManagerBase {
        private resourceSet: resourceSet.ResourceSet;

        private static DefaultLanguage: string = "en";

        protected get ResourcesDir(): string {
            throw new Error("foo");
        }

        public getString(id: string, ...optionalArgs: any[]): string {

            if (this.resourceSet == null) {
                var matchingLanguage = ResourceManagerBase.getBestMatchingLanguage(this.ResourcesDir, ResourceManagerBase.getCurrentLanguage());
                var resourceFilePath = ResourceManagerBase.getResourceFilePath(this.ResourcesDir, matchingLanguage);
                this.resourceSet = new ResourceSet(path.join(resourceFilePath));
            }

            return this.resourceSet.getString(id, optionalArgs);
        }

        private static getCurrentLanguage(): string {
            return global.LANG || process.env.LANG || ResourceManagerBase.DefaultLanguage;
        }

        private static getBestMatchingLanguage(resourcesDir: string, lang: string): string {
            var availableResources: string[] = ResourceManagerBase.getAvailableResources(resourcesDir);
            while (lang != ResourceManagerBase.DefaultLanguage) {
                if (availableResources.indexOf(lang) >= 0) {
                    break;
                }
                // get parent language
                lang = lang.indexOf("-") > 0 ? lang.split("-")[0] : ResourceManagerBase.DefaultLanguage;
            }

            return lang;
        }

        private static getAvailableResources(resourcesDir: string): string[]{
            var availableLanguages: string[] = [];
            fs.readdirSync(resourcesDir).forEach(function (filename: string): void {
                try {
                    if (fs.existsSync(ResourceManagerBase.getResourceFilePath(resourcesDir, filename))){
                        availableLanguages.push(filename);
                    }
                } catch (e) {
                    // Folder was not a valid resource; ignore it
                }
            });

            return availableLanguages;
        }

        private static getResourceFilePath(resourcesDir: string, lang: string): string {
            return path.join(resourcesDir, lang, "resources.json");
        }
    }
}

export = TacoUtility;