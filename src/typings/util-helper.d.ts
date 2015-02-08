/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    class UtilHelper {
        private static InvalidAppNameChars;
        /** Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string * */
        static argToBool(input: any): boolean;
        static readFileContentsSync(filename: string, encoding?: string): string;
        static getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[];
    }
}