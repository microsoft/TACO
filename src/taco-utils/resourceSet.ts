/// <reference path="../typings/node.d.ts" />

import path = require("path");
import tacoUtility = require("./utilHelper");
import UtilHelper = tacoUtility.UtilHelper;

module TacoUtility {

    export class ResourceSet {

        private resources: { [key: string]: any; } = {};

        constructor(resourceFileName: string) {
            var self = this;
            var res = require(resourceFileName);
            Object.keys(res).forEach(function (key: string): void {
                self.resources[key] = res[key];
            });
        }

        public getString(id: string, ...optionalArgs: any[]): string {
            var s = this.resources[id];
            if (!s) {
                return s;
            } else if (Array.isArray(s)) {
                // Allow longer resources strings to be specified as a list of strings, which represent multiple lines
                s = s.join("\n");
            }

            var result: string = s;
            /*All args passed to current function:
            you can call getString('foo', 'bar', 'baz') or getString('foo',['bar', 'baz']) 
            and the utility function will extract ['bar', 'baz'] as args in both cases*/
            var args: string[] = UtilHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            if (args) {
                for (var i: number = 0; i < args.length; i++) {
                    result = result.replace(new RegExp("\\{" + i + "\\}", "g"), args[i]);
                }
            }

            return result;
        }
    }
}

export = TacoUtility;