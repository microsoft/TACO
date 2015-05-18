/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
declare module TacoUtility {
    module Logger {
        /**
         * Warning levels
         */
        enum Level {
            Warn = 0,
            Error = 1,
            Link = 2,
            Normal = 3,
            Success = 4,
            NormalBold = 5,
        }
    }
    class Logger {
        /**
         * returns colorized string
         * wrapping "colors" module because not yet possible to combine themes, i.e. ["yellow", "bold"]:  https://github.com/Marak/colors.js/issues/72
         */
        static colorize(msg: string, level: Logger.Level): string;
        /**
         * log
         */
        static log(msg: string, level?: Logger.Level): void;
        /**
         * for quick logging use
         */
        static logLine(msg: string, level?: Logger.Level): void;
        static logErrorLine(msg: string): void;
        static logWarnLine(msg: string): void;
        static logLinkLine(msg: string): void;
        static logNormalLine(msg: string): void;
        static logNormalBoldLine(msg: string): void;
        static logSuccessLine(msg: string): void;
    }
}
