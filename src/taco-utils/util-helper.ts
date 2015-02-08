/// <reference path="../typings/node.d.ts" />
import fs = require("fs");

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
		/** Converts an untyped argument into a boolean in a "sensible" way, treating only the string "true" as true rather than any non-empty string * */
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