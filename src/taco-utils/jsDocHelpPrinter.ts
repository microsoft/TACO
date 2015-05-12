/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

"use strict";
import LoggerModule = require ("./logger");
import ResourceManager = require ("./resourceManager");

import Logger = LoggerModule.Logger;

module TacoUtility {
    export class JSDocHelpPrinter {
        private jsDocEntries: JSDocHelpPrinter.IJSDocEntry[];
        private resources: ResourceManager.ResourceManager;

        constructor(filename: string, resources: ResourceManager.ResourceManager) {
            this.jsDocEntries = require(filename);
            this.resources = resources;
        }

        public printHelp(prefix: string = "  "): void {
            var maxLength = 0;
            // The JSDoc entries that we care about are those which had "@LOCTAG foo" specified, so first we filter down to those
            var helpDocs = this.jsDocEntries.filter(function (value: JSDocHelpPrinter.IJSDocEntry): boolean {
                var relevant = value.customTags && value.customTags.some(function (tag: JSDocHelpPrinter.IJSDocCustomTag): boolean {
                    return tag.tag === "loctag";
                });
                if (relevant) {
                    // While collecting these entries, keep track of how long the longest is
                    maxLength = value.name.length > maxLength ? value.name.length : maxLength;
                }

                return relevant;
            });
            // We want to make sure that we allocate space for maxLength characters, plus a space to separate the description
            // Simplest approach is to make an array with that many gaps, and thus maxLength + 2 entries, and fill the gaps with spaces
            var padding = Array(maxLength + 2).join(" ");
            var self = this;
            helpDocs.forEach(function (value: JSDocHelpPrinter.IJSDocEntry): void {
                var loctag = value.customTags.filter(function (tag: JSDocHelpPrinter.IJSDocCustomTag): boolean {
                    return tag.tag === "loctag";
                })[0];
                // We want to print something of the form "prefix value [padding] Localized Message"
                // e.g. "  --foo       Defines the foo property"
                //      "  --longerArg Defines a longer argument"
                var paddedName = prefix + value.name + padding.substring(value.name.length);
                Logger.log(paddedName, Logger.Level.Warn);
                Logger.logLine(self.resources.getString(loctag.value));
            });
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