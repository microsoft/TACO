/**
﻿ * ******************************************************
﻿ *                                                       *
﻿ *   Copyright (C) Microsoft. All rights reserved.       *
﻿ *                                                       *
﻿ *******************************************************
﻿ */
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";
var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import mocha = require ("mocha");
import path = require ("path");

import resources = require ("../resources/resourceManager");
import tacoKits = require ("../tacoKits");
import tacoUtils = require ("taco-utils");

import kitHelper = tacoKits.KitHelper;

describe("KitHelper", function (): void {
    // Test Kit Info
    var testDefaultKitId: string = "5.0.0-Kit";
    var testDeprecatedKitId: string = "4.0.0-Kit";
    var testDefaultTemplateId: string = "blank";
    var testDeprecatedKitInfo: tacoKits.IKitInfo = {
        "cordova-cli": "4.0.0",
        "taco-min": "1.0.0",
        releaseNotesUri: "http://cordova.apache.org/4.0.0/release.md",
        name: "4.0.0 Kit for Cordova Development",
        deprecated: true,
        deprecatedReasonUri: "http://cordova.apache.org/blog/2014102310023",
        plugins: {
            "org.apache.cordova.camera": {
                version: "0.2.27",
                platforms: "ios, android, wp8"
            },
            "org.apache.cordova.media-capture": {
                version: "0.3.4",
                platforms: "ios, android, windows, windows8"
            }
        }
    };

    var templateSrcPath = path.resolve(__dirname, "..", "templates", "5.0.0-kit", "blank.zip");
    var testTemplateOverrideInfo: tacoKits.ITemplateOverrideInfo = {
        kitId: "5.0.0-Kit",
        templateInfo: {
            name: "Blank template",
            url: templateSrcPath
        }
    };

    var testPlatformOverridesForDefaultKit: tacoKits.IPlatformOverrideMetadata = {
        android: {
            version: "4.2.1",
            src: "https://github.com/apache/cordova-android/tree/4.2.1/archive/4.2.1.tgz"
        },
        ios: {
            version: "4.2.2",
            src: "https://github.com/apache/cordova-ios/tree/4.2.2/archive/4.2.2.tgz"
        },
        windows: {
            version: "4.0.0",
            src: "https://github.com/apache/cordova-windows/tree/4.0.0/archive/4.0.0.tgz"
        },
        wp8: {
            version: "4.0.2",
            src: "https://github.com/apache/cordova-wp8/tree/4.0.2/archive/4.0.2.tgz"
        }
    };

    var testPluginOverridesForDefaultKit: tacoKits.IPluginOverrideMetadata = {
        "org.apache.cordova.camera": {
            version: "0.3.10"
        }
    };

    var testDefaultKitInfo: tacoKits.IKitInfo = {
        "cordova-cli": "5.0.0",
        "taco-min": "1.0.0",
        default: true,
        releaseNotesUri: "http://cordova.apache.org/5.0.0/release.md",
        name: "5.0.0 Kit for Cordova Development",
        platforms: testPlatformOverridesForDefaultKit,
        plugins: testPluginOverridesForDefaultKit
    };

    // Important paths
    before(function (): void {
        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;
        
        // Set the kit metadata file location
        kitHelper.KitMetadataFilePath = path.resolve(__dirname, "test-data", "test-kit-metadata.json");
    });

    after(function (): void {
        // Reset ResourcesManager back to production mode
        process.env["TACO_UNIT_TEST"] = false;

        // Reset kit metadata path
        kitHelper.KitMetadataFilePath = null;
    });

    describe("getKitMetadata()", function (): void {
        it("must return the right kit metadata", function (done: MochaDone): void {
            // Call getKitMetadata()
            kitHelper.getKitMetadata()
                .then(function (kitInfo: TacoKits.ITacoKitMetadata): void {
                // Verify the returned kit metadata is expected
                kitInfo.should.equal(require(kitHelper.KitMetadataFilePath));
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });
    });

    describe("getKitInfo()", function (): void {
        it("must return the right kit information for the deprecated kit ID passed", function (done: MochaDone): void {
            // Call getKitInfo()
            kitHelper.getKitInfo(testDeprecatedKitId)
                .then(function (kitInfo: TacoKits.IKitInfo): void {
                // Verify the returned kitInfo is correct
                var stringifiedInfo = JSON.stringify(kitInfo);
                stringifiedInfo.should.equal(JSON.stringify(testDeprecatedKitInfo));
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });

        it("must return the right kit information for the default kit ID passed", function (done: MochaDone): void {
            kitHelper.getKitInfo(testDefaultKitId)
                .then(function (kitInfo: TacoKits.IKitInfo): void {
                // Verify the returned kitInfo is correct
                var stringifiedInfo = JSON.stringify(kitInfo);
                stringifiedInfo.should.equal(JSON.stringify(testDefaultKitInfo));
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });
    });

    describe("getDefaultKit()", function (): void {
        it("must return the ID of the default kit", function (done: MochaDone): void {
            // Call getDefaultKit()
            kitHelper.getDefaultKit()
                .then(function (kitId: string): void {
                // Verify the returned kitId is correct
                kitId.should.equal(testDefaultKitId);
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });
    });

    describe("getPlatformOverridesForKit()", function (): void {
        it("must return the platform overrides of the specified kit", function (done: MochaDone): void {
            // Call getDefaultKit() to get the default kitId and pass it as param to getPlatformOverridesForKit
            kitHelper.getDefaultKit()
                .then(function (kitId: string): void {
                kitHelper.getPlatformOverridesForKit(kitId)
                    .then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): void {
                    // Verify the returned override info is correct
                    platformOverrides.should.equal(testPlatformOverridesForDefaultKit);
                    done();
                });
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });          
        });
    });

    describe("getPluginOverridesForKit()", function (): void {
        it("must return the plugin overrides of the specified kit", function (done: MochaDone): void {
            // Call getDefaultKit() to get the default kitId and pass it as param to getPluginOverridesForKit
            kitHelper.getDefaultKit()
                .then(function (kitId: string): void {
                kitHelper.getPluginOverridesForKit(kitId)
                    .then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): void {
                    // Verify the returned override info is correct
                    pluginOverrides.should.equal(testPluginOverridesForDefaultKit);
                    done();
                });
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });
    });

    describe("isKitDeprecated()", function (): void {
        it("must return false when a non-deprecated kit ID is passed", function (done: MochaDone): void {
            // Ensure that the default kit is not deprecated
            var isDeprecated: boolean = kitHelper.isKitDeprecated(testDefaultKitInfo);
            isDeprecated.should.equal(false);
            done();
        });

        it("must return true when a deprecated kit ID is passed", function (done: MochaDone): void {
            // Ensure that for a deprecated kit,  isKitDeprecated() returns true
            var isDeprecated: boolean = kitHelper.isKitDeprecated(testDeprecatedKitInfo);
            isDeprecated.should.equal(true);
            done();
        });
    });

    describe("getTemplateOverrideInfo()", function (): void {
        it("must return the template override information for the kit ID and template ID passed", function (done: MochaDone): void {
            // Call getTemplateOverrideInfo()
            kitHelper.getTemplateOverrideInfo(testDefaultKitId, testDefaultTemplateId)
                .then(function (templateOverrideInfo: TacoKits.ITemplateOverrideInfo): void {
                // Verify the returned override info is correct
                var stringifiedInfo = JSON.stringify(templateOverrideInfo);
                stringifiedInfo.should.equal(JSON.stringify(testTemplateOverrideInfo));
                done();
            }).catch(function (err: string): void {
                done(new Error(err));
            });
        });
    });
});