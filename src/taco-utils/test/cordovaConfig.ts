/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
"use strict";
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
import fs = require ("fs");
import mocha = require ("mocha");
import path = require ("path");
import should = require ("should");

import util = require ("../tacoUtils");

/// <disable code="SA1301" justification="CordovaConfig is a class" /> 
var CordovaConfig = util.CordovaConfig;
/// <enable code="SA1301" />

describe("CordovaConfig", function (): void {
    it("should correctly parse config files", function (): void {
        var cfg = new CordovaConfig(path.join(__dirname, "resources", "config.xml"));
        cfg.id().should.equal("org.foo.bar");
        cfg.name().should.equal("FooBar");
        cfg.version().should.equal("0.9.2");
    });

    it("should correctly normalize unicode display names", function (): void {
        var cfg = new CordovaConfig(path.join(__dirname, "resources", "config_unicode.xml"));
        cfg.name().should.equal("隣兀﨩"); // Note that this is NOT identical to the name in config_unicode, it is the normalized form.
    });
});