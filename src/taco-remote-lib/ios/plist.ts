/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/node.d.ts" />
/// <reference path="../../typings/plist-with-patches.d.ts" />
/// <reference path="../../typings/tacoUtils.d.ts" />
"use strict";

import fs = require ("fs");
import path = require ("path");
import pl = require ("plist-with-patches");

import utils = require ("taco-utils");

module Plist {
    export function updateAppBundleVersion(pathToAppPlist: string, buildNumber: number): void {
        var plistInfo = pl.parseFileSync(pathToAppPlist);
        var version = plistInfo["CFBundleVersion"];
        version = version ? version + "." + buildNumber : "" + buildNumber;
        plistInfo["CFBundleVersion"] = version;
        var updatedPlistContents = pl.build(plistInfo);
        updatedPlistContents = updatedPlistContents.replace(/<string>[\s\r\n]*<\/string>/g, "<string></string>");
        fs.writeFileSync(pathToAppPlist, updatedPlistContents, "utf-8");
    }

    export function createEnterprisePlist(cordovaConfigOrPathToConfigXml: any, outFilePath: string): void {
        var cfg = cordovaConfigOrPathToConfigXml;
        if (typeof cordovaConfigOrPathToConfigXml === "string") {
            cfg = new utils.CordovaConfig(cordovaConfigOrPathToConfigXml);
        }

        var id = cfg.id();
        var version = cfg.version();
        var name = cfg.name();

        var plistContents = getTemplateContents();
        plistContents = plistContents.replace("${BUNDLE_IDENTIFIER}", id);
        plistContents = plistContents.replace("${APPLICATION_VERSION}", version);
        plistContents = plistContents.replace("${DISPLAY_NAME}", name);
        fs.writeFileSync(outFilePath, plistContents);
    };

    var templateContents: string = null;

    function getTemplateContents(): string {
        if (!templateContents) {
            var templatePath = path.join(__dirname, "templates", "EnterpriseApp.plist");
            templateContents = utils.UtilHelper.readFileContentsSync(templatePath, "utf-8");
        }

        return templateContents;
    }
}

export = Plist;
