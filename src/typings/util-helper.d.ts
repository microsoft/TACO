/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
declare module TacoUtility {
    class UtilHelper {
        private static InvalidAppNameChars;
        /**
         * Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string
         *
         * @param {any} input Any object that we want to determine its truthiness
         *
         * @return {boolean} For strings, this is whether the string is case-insensitively equal to "true", otherwise it is javascript's interpretation of truthiness
         */
        static argToBool(input: any): boolean;
        static readFileContentsSync(filename: string, encoding?: string): string;
        static copyFile(from: string, to: string, encoding?: string): Q.Promise<any>;
        /**
         * Extract optional arguments from an arguments array.
         *
         * @param {IArguments} functionArguments The "arguments" from another function
         * @param {number} startFrom The offset where the optional arguments begin
         *
         * @returns {any[]} If functionArguments[startFrom] is an array, then that is returned. Otherwise the functionArguments array except for the first startFrom elements.
         */
        static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];

        static parseArguments(knownOptions: any, shortHands?: any, args?: string[], slice?: number): any;
    }
}
