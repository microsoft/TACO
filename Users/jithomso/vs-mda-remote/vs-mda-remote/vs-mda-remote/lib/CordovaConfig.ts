/********************************************************
*                                                       *
*   Copyright (C) Microsoft. All rights reserved.       *
*                                                       *
********************************************************/
"use strict";

import et = require('elementtree');
import path = require('path');

import util = require('./util');

class CordovaConfig {
    doc: et.ElementTree;

    constructor(configXmlPath: string) {
        var contents = util.readFileContentsSync(configXmlPath, 'utf-8');
        this.doc = new et.ElementTree(et.XML(contents));
    }

    id() : string {
        return this.doc.getroot().attrib['id'];
    }

    name(): string {
        var el = this.doc.find('name');
        return el && el.text && el.text.trim();
    }

    version(): string {
        var el = this.doc.getroot();
        return el && el.attrib && el.attrib['version']
    }

    preferences(): { [key: string]: string } {
        var data: { [key: string]: string } = {};
        var preferences = this.doc.findall('preference');
        preferences.forEach(function (preference) {
            data[preference.attrib['name']] = preference.attrib['value'];
        });

        return data
    }
}

export = CordovaConfig;