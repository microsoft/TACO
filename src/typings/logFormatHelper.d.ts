/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/colors.d.ts" />
declare module TacoUtility {
    class LogFormatHelper {
        private static TagRegex;
        /**
         * msg can be any string with styles classes defined in xml tags
         * <blue><bold>Hello World!!!</bold></blue>
         * if using any kind of formatting, make sure that it is well formatted
         * Ideally we should prefer using styles (for e.g. <title>, <success>) instead of bold, red, green kind of tags.
         * special tag <br> is supported to allow line breaks
         */
        static toFormattedString(msg: string): string;

        /**
        * Strip the colors of a formatted message
        */
        static strip(msg: string): string;

        /**
         * Helper method to convert a message to error format
         * @param {string} input string
         */
        static toError(msg: string): string;
        /**
         * Helper method to convert a message to warning format
         * @param {string} input string
         */
        static toWarning(msg: string): string;
        /**
         * Helper method to return a repeated string
         * @param {string} string to repeat
         * @param {string} repeat count
         */
        static repeat(c: string, n: number): string;
        static getFormattedStringLength(msg: string): number;
        static isFormattedString(msg: string): boolean;
        /**
         * Helper method to replace <br/> tags to end of line char
         * @param {string} input string
         */
        private static convertBrTags(msg);
        private static forEachTagMatch(msg, callback);
        private static colorize(str, styles);
    }
}
