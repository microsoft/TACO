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
        /**
         * returns colorized string
         * wrapping "colors" module because not yet possible to combine themes, i.e. ["yellow", "bold"]:  https://github.com/Marak/colors.js/issues/72
         */
        function colorize(msg: string, level: Level): string;
        /**
         * log
         */
        function log(msg: string, level?: Level): void;
        /**
         * for quick logging use
         */
        function logLine(msg: string, level?: Level): void;
        function logErrorLine(msg: string): void;
        function logWarnLine(msg: string): void;
        function logLinkLine(msg: string): void;
        function logNormalLine(msg: string): void;
        function logNormalBoldLine(msg: string): void;
        function logSuccessLine(msg: string): void;
    }
}
