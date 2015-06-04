/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/nameDescription.d.ts" />

"use strict";
import loggerHelper = require ("./loggerHelper");
import ResourceManager = require ("./resourceManager");

import LoggerHelper = loggerHelper.LoggerHelper;

module TacoUtility {
    export class JSDocHelpPrinter {
        private jsDocEntries: JSDocHelpPrinter.IJSDocEntry[];
        private resources: ResourceManager.ResourceManager;

        constructor(filename: string, resources: ResourceManager.ResourceManager) {
            this.jsDocEntries = require(filename);
            this.resources = resources;
        }

        public printHelp(prefix: string = "  "): void {
            // The JSDoc entries that we care about are those which had "@LOCTAG foo" specified, so first we filter down to those
            var helpDocs = this.jsDocEntries.filter(function (value: JSDocHelpPrinter.IJSDocEntry): boolean {
                var relevant = value.customTags && value.customTags.some(function (tag: JSDocHelpPrinter.IJSDocCustomTag): boolean {
                    return tag.tag === "loctag";
                });

                return relevant;
            });
            // We want to make sure that we allocate space for maxLength characters, plus a space to separate the description
            // Simplest approach is to make an array with that many gaps, and thus maxLength + 2 entries, and fill the gaps with spaces
            var self = this;
            var nameValuePairs: INameDescription[] = new Array();
            helpDocs.forEach(function (value: JSDocHelpPrinter.IJSDocEntry): void {
                var loctag = value.customTags.filter(function (tag: JSDocHelpPrinter.IJSDocCustomTag): boolean {
                    return tag.tag === "loctag";
                })[0];

                nameValuePairs.push({ name: prefix + value.name, description: self.resources.getString(loctag.value) });
            });
            LoggerHelper.logNameValueTable(nameValuePairs);
        }
    }

    export module JSDocHelpPrinter {
        export interface IJSDocEntry {
            name: string;
            customTags?: IJSDocCustomTag[]
        };
        export interface IJSDocCustomTag {
            tag: string;
            value: string
        };
    }
}

export = TacoUtility;