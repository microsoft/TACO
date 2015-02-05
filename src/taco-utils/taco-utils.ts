/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/elementtree.d.ts"/>
/// <reference path="../typings/unorm.d.ts"/>
"use strict";

import et = require ("elementtree");
import fs = require ("fs");
import path = require ("path");
var unorm = require("unorm"); // Note no import: the compiler will remove the require since we don't use the unorm object, we just need it to add String.normalize

module TacoUtility {
    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export class ResourcesManager {        
        private static Resources: { [key: string]: any; } = null;
        private static SupportedLanguages: string[] = null;
        private static DefaultLanguage: string = "en";

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

    export class CordovaConfig {
        /** CordovaConfig is a class for parsing the config.xml file for Cordova projects */
        private _doc: et.ElementTree;

        constructor(configXmlPath: string) {
            var contents = UtilHelper.readFileContentsSync(configXmlPath, "utf-8");
            this._doc = new et.ElementTree(et.XML(contents));
        }

        public id(): string {
            return this._doc.getroot().attrib["id"];
        }

        public name(): string {
            var el = this._doc.find("name");
            return el && el.text && el.text.trim().normalize();
        }

        public version(): string {
            var el = this._doc.getroot();
            return el && el.attrib && el.attrib["version"];
        }

        public preferences(): { [key: string]: string } {
            var data: { [key: string]: string } = {};
            var preferences = this._doc.findall("preference");
            preferences.forEach(function (preference: et.XMLElement): void {
                data[preference.attrib["name"]] = preference.attrib["value"];
            });

            return data;
        }
    }

    export class UtilHelper {
        private static InvalidAppNameChars = {
            34: "\"",
            36: "$",
            38: "&",
            39: "/",
            60: "<",
            92: "\\"
        };
        /** Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string * */
        public static argToBool(input: any): boolean {
            if (typeof input === "string") {
                return input.toLowerCase() === "true";
            }

            return !!input;
        }

        public static readFileContentsSync(filename: string, encoding?: string): string {
            var contents = fs.readFileSync(filename, (encoding || "utf-8"));
            if (contents) {
                contents = contents.replace(/^\uFEFF/, ""); // Windows is the BOM
            }

            return contents;
        }

        public static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[] {
            if (functionArguments.length <= startFrom) {
                return null;
            }

            if (Array.isArray(functionArguments[startFrom])) {
                return functionArguments[startFrom];
            }

            return Array.prototype.slice.apply(functionArguments, [startFrom]);
        }
    }

    export class BuildInfo {
        public status: string;
        /**
         * BuildInfo holds relevant information about a particular build, including its identifier, what kind of build was requested, and the status of the build
         * This information is passed around both within the remote build server, and back to the client
         */
        public changeList: {
            deletedFiles: string[];
            changedFiles: string[];
            addedPlugins: string[];
            deletedPlugins: string[];
            deletedFilesIos: string[];
            changedFilesIos: string[];
            addedPluginsIos: string[];
            deletedPluginsIos: string[];
        };
        public statusTime: Date;
        public cordovaVersion: string;
        public buildCommand: string;
        public configuration: string;
        public options: any;
        public buildDir: string;
        public buildLang: string;
        public buildPlatform: string;
        public submissionTime: Date;
        public buildNumber: number;

        public messageId: string;
        public messageArgs: any[];
        public message: string;

        public tgzFilePath: string;
        public appDir: string;
        public appName: string;

        public webDebugProxyPort: number;

        constructor(params: { buildNumber?: number; status?: string; cordovaVersion?: string; buildCommand?: string; configuration?: string; options?: any; buildDir?: string; buildLang?: string; buildPlatform?: string }) {
            this.buildNumber = params.buildNumber;
            this.status = params.status;
            this.cordovaVersion = params.cordovaVersion;
            this.buildCommand = params.buildCommand;
            this.configuration = params.configuration;
            this.options = params.options;
            this.buildDir = params.buildDir;
            this.buildLang = params.buildLang;
            this.buildPlatform = params.buildPlatform;
            this.submissionTime = new Date();
            this.changeList = null;
        }

        public static createNewBuildInfoFromDataObject(buildInfoData: any): BuildInfo {
            var bi: any = new BuildInfo(buildInfoData);
            Object.keys(buildInfoData).forEach(function (k: string): void {
                bi[k] = buildInfoData[k];
            });
            return bi;
        }

        public updateStatus(status: string, messageId?: string, ...messageArgs: any[]): void {
            this.status = status;
            this.messageId = messageId;
            if (arguments.length > 2) {
                this.messageArgs = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 2);
            }

            this.statusTime = new Date();
        }

        public localize(req: any): BuildInfo {
            if (this.messageId) {
                this.message = ResourcesManager.getStringForLanguage(req, this.messageId, this.messageArgs);
            } else {
                this.message = ResourcesManager.getStringForLanguage(req, "Build-" + this.status);
            }

            return this;
        }
    }
}

export = TacoUtility;