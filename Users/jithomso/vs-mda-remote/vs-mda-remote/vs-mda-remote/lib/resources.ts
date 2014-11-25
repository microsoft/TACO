/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import fs = require('fs');
import path = require('path');
import util = require('./util');

module Resources {
    interface IResourceHashMap {
        [key: string]: any;
    }
    var resources: IResourceHashMap = null;
    var supportedLanguages: string[] = null;
    var defaultLang = 'en';

    export function init(resourcesDir?: string) {
        if (!resourcesDir) {
            resourcesDir = path.join(__dirname, '..', 'resources');
        }
        supportedLanguages = fs.readdirSync(resourcesDir).filter(function (filename: string): boolean {
            return fs.existsSync(path.join(resourcesDir, filename, 'resources.json'));
        });

        resources = {};
        supportedLanguages.map(function (language: string) {
            resources[language.toLowerCase()] = loadLanguage(resourcesDir, language);
            return language.toLowerCase();
        });
    }

    // Support acceptLangs as an array of strings like ['en-US', 'es'], 
    // or a http request 'Accept-Language' format header like pl,fr-FR;q=0.3,en-US;q=0.1. For now we do not account for the quality (q) value
    export function getString(requestOrAcceptLangs: any, id: string, ...optionalArgs: any[]) : string {
        if (resources === null) {
            throw new Error('Resources have not been loaded');
        }

        var lang = getBestLanguageMatchOrDefault(requestOrAcceptLangs);
        var s: any = resources[lang][id];
        if (!s) {
            return s;
        }

        if (Array.isArray(s)) {
            s = s.join('\n');
        }

        var args: any[] = getOptionalArgsArrayFromFunctionCall(arguments, 2);
        if (args != null) {
            for (var i: number = 0; i < args.length; ++i) {
                s = s.replace('{' + i + '}', args[i]);
            }
        }

        return s;
    }

    function getBestLanguageMatchOrDefault(requestOrAcceptLangs: any): string {
        var lang = bestLanguageMatch(requestOrAcceptLangs);
        if (!resources[lang]) {
            lang = defaultLang;
        }
        return lang.toLowerCase();
    }

    function bestLanguageMatch(requestOrAcceptLangs: any): string {
        if (Array.isArray(requestOrAcceptLangs)) {
            return getBestLanguageFromArray(requestOrAcceptLangs);
        }

        var langString: string;
        if (typeof requestOrAcceptLangs === 'string') {
            langString = requestOrAcceptLangs;
        } else if (requestOrAcceptLangs.header) {
            langString = requestOrAcceptLangs.header['accept-language'];
        } else {
            throw new Error('Unsupported type of argument for acceptLangs: ' + (typeof requestOrAcceptLangs));
        }

        return getBestLanguageFromArray(langString.split(',').map(function (l) { return l.split(';')[0]; }));
    }

    function getBestLanguageFromArray(acceptLangs: string[]): string {
        var primaryLanguageMatch: string = null;
        for (var i: number = 0; i < acceptLangs.length; ++i) {
            var lang: string = acceptLangs[i].toLowerCase();
            var primaryLang = lang.split('-')[0];
            if (supportedLanguages.indexOf(lang) !== -1) {
                // Exact match on full language header, which could include the region
                return lang;
            }

            if (supportedLanguages.indexOf(primaryLang) !== -1) {
                // Match on primary language (e.g. it from it-CH). We may find a better match later, so continue looking.
                primaryLanguageMatch = primaryLang;
            }
        }
        return primaryLanguageMatch;
    }

    function loadLanguage(dir: string, language: string): any {
        var resourcesPath = path.join(dir, language, 'resources.json');
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
}

export = Resources;