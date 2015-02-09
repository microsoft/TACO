/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/Q.d.ts" />
import fs = require("fs");
import Q = require("q");

module TacoUtility {
    export class UtilHelper {
        private static InvalidAppNameChars = {
            34: "\"",
            36: "$",
            38: "&",
            39: "/",
            60: "<",
            92: "\\"
        };
        /** Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string 
         *
         * @param {any} input Any object that we want to determine its truthiness
         *
         * @return {boolean} For strings, this is whether the string is case-insensitively equal to "true", otherwise it is javascript's interpretation of truthiness
         */
        public static argToBool(input: any): boolean {
            if (typeof input === "string") {
                return input.toLowerCase() === "true";
            }

            return !!input;
        }

        public static readFileContentsSync(filename: string, encoding?: string): string {
            var contents = fs.readFileSync(filename,(encoding || "utf-8"));
            if (contents) {
                contents = contents.replace(/^\uFEFF/, ""); // Windows is the BOM
            }

            return contents;
        }

        public static copyFile(from: string, to: string, encoding?: string): Q.Promise<{}> {
            var deferred = Q.defer();
            var newFile = fs.createWriteStream(to, { encoding: encoding });
            var oldFile = fs.createReadStream(from, { encoding: encoding });
            newFile.on("finish", function (): void {
                deferred.resolve({});
            });
            newFile.on("error", function (e: any): void {
                deferred.reject(e);
            });
            oldFile.on("error", function (e: any): void {
                deferred.reject(e);
            });
            oldFile.pipe(newFile);
            return deferred.promise;
            /*
                // The original code here stripped out byte order markers (but also potentially mangle binary files)
                var contents = readFileContentsSync(from, encoding);
                fs.writeFileSync(to, contents, { encoding: encoding });
        */
        }


        /**
         * Extract optional arguments from an arguments array.
         * 
         * @param {IArguments} functionArguments The "arguments" from another function
         * @param {number} startFrom The offset where the optional arguments begin
         *
         * @returns {any[]} If functionArguments[startFrom] is an array, then that is returned. Otherwise the functionArguments array except for the first startFrom elements.
         */
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