/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";
import fs = require ("fs");
import path = require ("path");

var resources = null;
var defaultLanguage: string = "en";

export function init(language: string, resourcesDir?: string): void {
    if (!resourcesDir) {
        resourcesDir = path.join(__dirname, "..", "resources");
    }

    var lang = bestLanguageMatchOrDefault(language, resourcesDir);
    resources = loadLanguage(lang, resourcesDir);
}

export function getString(id: string, ...optionalArgs: any[]): string {
    if (!resources) {
        throw new Error("Resources have not been loaded");
    }

    var s = resources[id];
    if (!s) {
        return s;
    }

    var args = getOptionalArgsArrayFromFunctionCall(arguments, 1);
    if (args) {
        for (var i: number = 0; i < args.length; i++) {
            s = s.replace("{" + i + "}", args[i]);
        }
    }

    return s;
}

function bestLanguageMatchOrDefault(language: string, resourcesDir: string): string {
    if (!language) {
        return defaultLanguage;
    }

    var supportedLanguages: string[] = [];
    fs.readdirSync(resourcesDir).filter(function (c: string): boolean {
        return fs.existsSync(path.join(resourcesDir, c, "resources.json"));
    }).forEach(function (l: string): void {
        supportedLanguages.push(l.toLowerCase());
    });

    // TODO: remove assumption of case insensitive file system, so this can work on non-windows systems.
    var lang = language.toLowerCase();
    if (supportedLanguages.indexOf(lang) !== -1) {
        // exact match on language, which could include the region (e.g. it-CH), return the match
        return lang;
    }

    var primaryLang = lang.split("-")[0];
    if (supportedLanguages.indexOf(primaryLang) !== -1) {
        // match on primary language (e.g. it from it-CH).
        return primaryLang;
    }

    return defaultLanguage;
}

function loadLanguage(language: string, resourcesDir: string): any {
    var resourcesPath = path.join(resourcesDir, language, "resources.json");
    return require(resourcesPath);
}

function getOptionalArgsArrayFromFunctionCall(functionArguments: IArguments, startFrom: number): any[] {
    if (functionArguments.length <= startFrom) {
        return null;
    }

    if (Array.isArray(functionArguments[startFrom])) {
        return functionArguments[startFrom];
    }

    return Array.prototype.slice.apply(functionArguments, [startFrom]);
}