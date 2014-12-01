/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import pl = require('plist-with-patches');
import fs = require('fs');
import path = require('path');
import CordovaConfig = require('./cordovaConfig');
import util = require('./util');

module Plist {

    export function updateAppBundleVersion(pathToAppPlist: string, buildNumber: number) {
        var plistInfo = pl.parseFileSync(pathToAppPlist);
        var version = plistInfo['CFBundleVersion'];
        version = version ? version + '.' + buildNumber : '' + buildNumber;
        plistInfo['CFBundleVersion'] = version;
        var updatedPlistContents = pl.build(plistInfo);
        updatedPlistContents = updatedPlistContents.replace(/<string>[\s\r\n]*<\/string>/g, '<string></string>');
        fs.writeFileSync(pathToAppPlist, updatedPlistContents, 'utf-8');
    }

    export function createEnterprisePlist (cordovaConfigOrPathToConfigXml: any, outFilePath: string) {
        var cfg = cordovaConfigOrPathToConfigXml;
        if (typeof cordovaConfigOrPathToConfigXml === 'string') {
            cfg = new CordovaConfig(cordovaConfigOrPathToConfigXml);
        }
        var id = cfg.id();
        var version = cfg.version();
        var name = cfg.name();

        var plistContents = getTemplateContents();
        plistContents = plistContents.replace('${BUNDLE_IDENTIFIER}', id);
        plistContents = plistContents.replace('${APPLICATION_VERSION}', version);
        plistContents = plistContents.replace('${DISPLAY_NAME}', name);
        fs.writeFileSync(outFilePath, plistContents);
        console.info('Created plist file %s from template with [%s, %s, %s]', outFilePath, id, version, name);
    };

    var templateContents = null;

    function getTemplateContents() {
        if (templateContents === null) {
            var templatePath = path.join(__dirname, '..', 'templates', 'EnterpriseApp.plist');
            templateContents = util.readFileContentsSync(templatePath, 'utf-8');
        }
        return templateContents;
    }
}

export = Plist;