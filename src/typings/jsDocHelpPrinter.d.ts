/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="./resourceManager.d.ts" />

declare module TacoUtility {
    class JSDocHelpPrinter {
        private jsDocEntries;
        private resources;
        constructor(filename: string, resources: TacoUtility.ResourceManager);
        printHelp(prefix?: string): void;
    }
    module JSDocHelpPrinter {
        interface IJSDocEntry {
            name: string;
            customTags?: IJSDocCustomTag[];
        }
        interface IJSDocCustomTag {
            tag: string;
            value: string;
        }
    }
}