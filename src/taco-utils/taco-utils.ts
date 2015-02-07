/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />

"use strict";
import fs = require("fs");
var colors = require("colors");
import path = require ("path");

module TacoUtility {    
    export module Logger {
        /**
         * Warning levels
         */
        export enum Level { Warn, Error, Link, Normal, Success, NormalBold };

        /**
         * returns colorized string
         * wrapping "colors" module because not yet possible to combine themes, i.e. ["yellow", "bold"]:  https://github.com/Marak/colors.js/issues/72
         */
        export function colorize(msg: string, level: Level): string {            
            colors.setTheme({
                error: "red",
                warn: "yellow",
                link: "blue",
                normalBold: "bold",
                success: "green"
            });

            switch (level) {
                case Level.Error: return msg.error.bold;
                case Level.Warn: return msg.warn.bold;
                case Level.Link: return msg.link.underline;
                case Level.Normal: return msg;
                case Level.NormalBold: return msg.normalBold;
                case Level.Success: return msg.success.bold;
            }
        }          

        /**
         * log
         */
        export function log(msg: string, level: Level): void {
            msg = colorize(msg, level);
            switch (level) {
                case Level.Error:
                case Level.Warn:
                    process.stderr.write(msg);
                    return;

                case Level.Link: 
                case Level.Success:
                case Level.Normal:
                case Level.NormalBold:
                    process.stdout.write(msg);
                    break;
            }
        }
        
        /** 
         * for quick logging use
         */ 
        export function logLine(msg: string, level: Level): void {
            log(msg + "\n", level);
        }

        export function logErrorLine(msg: string) {
            logLine(msg, Level.Error);
        }

        export function logWarnLine(msg: string) {
            logLine(msg, Level.Warn);
        }

        export function logLinkLine(msg: string) {
            logLine(msg, Level.Link);
        }

        export function logNormalLine(msg: string) {
            logLine(msg, Level.Normal);
        }

        export function logNormalBoldLine(msg: string) {
            logLine(msg, Level.NormalBold);
        }

        export function logSuccessLine(msg: string) {
            logLine(msg, Level.Success);
        }   
    }

    export module Commands {
        export interface INameDescription {
            name: string;
            description: string;
        }

        export interface ICommandInfo {
            synopsis: string;
            modulePath: string;
            description: string;
            args: INameDescription[];
            options: INameDescription[];
        }

        /**
         * Base command class, all other commands inherit from this
         */
        export interface ICommand {
            info: ICommandInfo;
            run(args: string[]): void;
            canHandleArgs(args: string[]): boolean;
        }

        /**
         * Factory to create new Commands classes
         */
        export class CommandFactory {
            private static args: any[];
            public static Listings: any;
            private static Instance: ICommand;

            /**
             * Factory to create new Commands classes
             * initialize with json file containing commands
             */
            public static init(commandsInfoPath: string) {
                commandsInfoPath = path.resolve(commandsInfoPath);
                if (!fs.existsSync(commandsInfoPath)) {
                    throw new Error(ResourcesManager.getString("taco-utils.exception.listingfile"));
                }

                CommandFactory.Listings = require(commandsInfoPath);
            }

            /**            
             * get specific task object, given task name
             */            
            public static getTask(name: string, inputArgs: string[]): ICommand {
                if (!name || !CommandFactory.Listings) {
                    throw new Error(ResourcesManager.getString("taco-utils.exception.listingfile"));
                }                

                var moduleInfo: ICommandInfo = CommandFactory.Listings[name];
                if (!moduleInfo) {
                    return null;
                }

                var modulePath = path.resolve(moduleInfo.modulePath);
                if (!fs.existsSync(modulePath + ".js")) {
                    throw new Error(ResourcesManager.getString("taco-utils.exception.missingcommand"));
                }

                var commandMod: any = require(modulePath);
                CommandFactory.Instance = new commandMod();
                CommandFactory.Instance.info = moduleInfo;

                if (CommandFactory.Instance && CommandFactory.Instance.canHandleArgs(inputArgs)) {
                    return CommandFactory.Instance;
                } else {
                    return null;
                }
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