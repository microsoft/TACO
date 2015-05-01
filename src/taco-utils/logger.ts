/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />

import fs = require ("fs");
import path = require ("path");
var colors = require("colors");

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
        export function log(msg: string, level: Level = Level.Normal): void {
            if (!msg) {
                return;
            }

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
        export function logLine(msg: string, level: Level = Level.Normal): void {
            log(msg + "\n", level);
        }

        export function logErrorLine(msg: string): void {
            logLine(msg, Level.Error);
        }

        export function logWarnLine(msg: string): void {
            logLine(msg, Level.Warn);
        }

        export function logLinkLine(msg: string): void {
            logLine(msg, Level.Link);
        }

        export function logNormalLine(msg: string): void {
            logLine(msg, Level.Normal);
        }

        export function logNormalBoldLine(msg: string): void {
            logLine(msg, Level.NormalBold);
        }

        export function logSuccessLine(msg: string): void {
            logLine(msg, Level.Success);
        }
    }
}

export = TacoUtility;