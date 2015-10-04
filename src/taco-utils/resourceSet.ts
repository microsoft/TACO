/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/node.d.ts" />

import path = require ("path");

import argsHelper = require ("./argsHelper");

import ArgsHelper = argsHelper.ArgsHelper;

module TacoUtility {
    export class ResourceSet {
        private resources: { [key: string]: any; } = {};

        constructor(resourceFileName: string) {
            var self: ResourceSet = this;
            var res: any = require(resourceFileName);
            Object.keys(res).forEach(function (key: string): void {
                self.resources[key] = res[key];
            });
        }

        public getString(id: string, ...optionalArgs: any[]): string {
            var s: any = this.resources[id];
            if (!s) {
                return s;
            } else if (Array.isArray(s)) {
                // Allow longer resources strings to be specified as a list of strings, which represent multiple lines
                s = (<string[]> s).join("\n");
            }

            var result: string = <string> s;
            /*All args passed to current function:
            you can call getString('foo', 'bar', 'baz') or getString('foo',['bar', 'baz']) 
            and the utility function will extract ['bar', 'baz'] as args in both cases*/
            var args: string[] = ArgsHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
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
