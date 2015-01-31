///<reference path="../typings/node.d.ts"/>
"use strict";

import fs = require("fs");
import path = require("path");

module TacoUtility {

    //put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export class ResourcesManager {
        private static _instance: ResourcesManager = null;
        private resources: any = null;
        private defaultLanguage: string = "en";

        public static getInstance(): ResourcesManager {
            if (!ResourcesManager._instance) {
                ResourcesManager._instance = new ResourcesManager();
            }
            return ResourcesManager._instance;
        }

        constructor() {
            if (ResourcesManager._instance) {
                throw new Error("Error:  instantiation failed, use ResourcesManager.getInstance() instead of new()");
            }
            else
                return this;
        }

        init(language: string, resourcesDir?: string) {            
            if (!resourcesDir) {
                resourcesDir = path.join(__dirname, "..", "resources");
            }

            var lang = this.bestLanguageMatchOrDefault(language, resourcesDir);
            this.resources = this.loadLanguage(lang, resourcesDir);
        }

        /**** ...optionalArgs is only there for typings, function rest params***/
        getString(id: string, ...optionalArgs: any[]): string {
            if (!this.resources) {
                throw new Error("Resources have not been loaded");
            }

            var s = this.resources[id];
            if (!s) {
                return s;
            }

            /*All args passed to current function:
            you can call getString('foo', 'bar', 'baz') or getString('foo',['bar', 'baz']) 
            and the utility function will extract ['bar', 'baz'] as args in both cases*/
            var args = this.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            if (args) {
                for (var i: number = 0; i < args.length; i++) {
                    s = s.replace("{" + i + "}", args[i]);
                }
            }

            return s;
        }

        bestLanguageMatchOrDefault(language: string, resourcesDir: string): string {
            if (!language) {
                return this.defaultLanguage;
            }

            var supportedLanguages: string[] = [];
            fs.readdirSync(resourcesDir).filter(function (c: string): boolean {
                return fs.existsSync(path.join(resourcesDir, c, "resources.json"));
            }).forEach(function (l: string): void {
                supportedLanguages.push(l.toLowerCase());
            });

            // TODO: remove assumption of case insensitive file system, so this can work on non-windows systems.
            var lang = language.toLowerCase();
            if (supportedLanguages.indexOf(lang) !== -1) {
                // exact match on language, which could include the region (e.g. it-CH), return the match
                return lang;
            }

            var primaryLang = lang.split("-")[0];
            if (supportedLanguages.indexOf(primaryLang) !== -1) {
                // match on primary language (e.g. it from it-CH).
                return primaryLang;
            }

            return this.defaultLanguage;
        }

        loadLanguage(language: string, resourcesDir: string): any {
            var resourcesPath = path.join(resourcesDir, language, "resources.json");
            return require(resourcesPath);
        }

        getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[] {
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






