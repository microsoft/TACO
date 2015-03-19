/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
/// <reference path="../typings/nopt.d.ts" />
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

        /**
         * Parse input arguments. Uses nopt, but enforces considering values starting with "--" as new flags, even if they immediately follow a flag that takes a value.
         * For example:
         * 
         * "taco create path --template --kit 4.0.0-Kit"
         * 
         * If both "template" and "kit" flags are defined as strings in knownOptions of nopt, then nopt would parse the above line as follows:
         * 
         * parsedArgs = { "template": "--kit", "argv": { "remain": [ "path", "4.0.0-Kit" ] } }
         * 
         * Notice how "--kit" gets consumed as "--template"'s value, even though it should be a new flag. This method instead parses the above command as follows:
         * 
         * parsedArgs = { "template": undefined, "kit": "4.0.0-Kit", "argv": { "remain": [ "path" ] } }
         * 
         * @param {Nopt.FlagTypeMap} the map of known options
         * @param {Nopt.ShortFlags} the known shorthands for the options
         * @param {string[]} the arguments to parse
         * @param {number} the amount of args to slice from the beginning of the the knownOptions array
         *
         * @returns {Nopt.OptionsParsed} the nopt parsed object
         */
        static parseArguments(knownOptions: Nopt.FlagTypeMap, shortHands?: Nopt.ShortFlags, args?: string[], slice?: number): Nopt.OptionsParsed;

        /**
         * Returns a new array where all occurences of a value were removed. Doesn't modify the original array.
         * 
         * @param {any[]} the array of elements
         * @param {any} the value to remove
         *
         * @returns {any[]} a new array where all occurences of the value are gone
         */
        static removeAllOccurences(elements: any[], value: any): any[];
    }
}
