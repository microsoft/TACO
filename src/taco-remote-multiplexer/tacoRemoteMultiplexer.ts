/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../typings/node.d.ts" />
/// <reference path="../typings/tacoRemoteMultiplexer.d.ts" />

import semver = require ("semver");

interface IModuleLookup {
    [id: string]: TacoRemoteMultiplexer.IPackageSpec
};

var moduleLookup: IModuleLookup = require("./moduleLookup.json");

class TacoRemoteMultiplexer implements TacoRemoteMultiplexer.ITacoRemoteMultiplexer {
    public getPackage(query: TacoRemoteMultiplexer.IPropertyBag): TacoRemoteMultiplexer.IPackageSpec {
        // Note: As new scenarios are added, place them at the top of the function and not the bottom.
        // This will ensure that if previous scenarios worked, they will continue to do so, and newer cases take precedence over older ones.
        if (semver.valid(query["vcordova"]) && semver.satisfies(query["vcordova"], ">=3.0.0 <5.0.0")) {
            return moduleLookup["tacoRemoteLib@0.0.1"];
        }

        return moduleLookup["tacoRemoteLib@0.0.1"];
    }
};

var tacoRemoteMultiplexer = new TacoRemoteMultiplexer();