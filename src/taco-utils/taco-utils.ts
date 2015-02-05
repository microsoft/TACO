/// <reference path="../typings/node.d.ts" />
"use strict";

import fs = require ("fs");
import path = require ("path");

module TacoUtility {
    export module Commands {
        export interface nameDescription {
            name: string;
            description: string;
        }

        export interface CommandInfo {
            modulePath: string;
            description: string;
            args: nameDescription[];
            options: nameDescription[];
        }

        export class Command {
            info: CommandInfo;
            constructor(input: CommandInfo) {
                this.info = input;                
            }
            public run() {
            }
        }

        export class CommandFactory {
            private static Listings: any;
            private static Instance: Command;

            // initialize with json file containing commands
            public static init(commandsInfoPath: string) {
                commandsInfoPath = path.resolve(commandsInfoPath);
                if (!fs.existsSync(commandsInfoPath)) {
                    throw new Error("Cannot find commands listing file");
                }

                CommandFactory.Listings = require(commandsInfoPath);
            }

            // get specific task object, given task name
            public static getTask(name: string): Command {
                if (!name || !CommandFactory.Listings) {
                    throw new Error("Cannot find command listing file");
                }

                if (CommandFactory.Instance) {
                    return CommandFactory.Instance;
                }

                var moduleInfo: CommandInfo = CommandFactory.Listings[name];
                var modulePath: string = path.resolve(moduleInfo.modulePath);
                if (!fs.existsSync(modulePath + ".js")) {
                    throw new Error("Cannot find command module");
                }

                var commandMod: typeof Command = require(modulePath);
                CommandFactory.Instance = new commandMod(moduleInfo);
                if (!CommandFactory.Instance) {
                    throw new Error("Can't build command instance");
                }

                return CommandFactory.Instance;
            }
        }
    }

    // put more classes here, known limitation that classes in external modules CANNOT span multiple files    
    export class ResourcesManager {        
        private static Resources: any = null;
        private static DefaultLanguage: string = "en";        

        public static init(language: string, resourcesDir?: string): void {            
            if (!resourcesDir) {
                resourcesDir = path.join(__dirname, "..", "resources");
            }

            var lang = this.bestLanguageMatchOrDefault(language, resourcesDir);
            this.Resources = this.loadLanguage(lang, resourcesDir);
        }

        /* ...optionalArgs is only there for typings, function rest params */
        public static getString(id: string, ...optionalArgs: any[]): string {
            if (!this.Resources) {
                throw new Error("Resources have not been loaded");
            }

            var s = this.Resources[id];
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

        public static bestLanguageMatchOrDefault(language: string, resourcesDir: string): string {
            if (!language) {
                return this.DefaultLanguage;
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

            return this.DefaultLanguage;
        }

        public static loadLanguage(language: string, resourcesDir: string): any {
            var resourcesPath = path.join(resourcesDir, language, "resources.json");
            return require(resourcesPath);
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
}

export = TacoUtility;