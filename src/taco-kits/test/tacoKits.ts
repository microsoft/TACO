/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>
/// <reference path="../../typings/tacoUtils.d.ts"/>
/// <reference path="../../typings/tacoKits.d.ts"/>

"use strict";

import mocha = require ("mocha");
import path = require ("path");
// Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.
var should_module = require("should");

import resources = require ("../resources/resourceManager");
import tacoErrorCodes = require ("../tacoErrorCodes");
import tacoKits = require ("../tacoKits");
import tacoUtils = require ("taco-utils");

import kitHelper = tacoKits.KitHelper;
import TacoErrorCodes = tacoErrorCodes.TacoErrorCode;
import utilHelper = tacoUtils.UtilHelper;

describe("KitHelper", function (): void {
    // Important paths
    var testMetadataPath: string = path.resolve(__dirname, "test-data", "test-kit-metadata.json");
    var realMetadataPath: string = path.resolve(__dirname, "..", "TacoKitMetaData.json");

    // Test Kit Info
    var testDefaultKitId: string = "5.0.0-Kit";
    var testDeprecatedKitId: string = "4.0.0-Kit";
    var testDefaultTemplateId: string = "blank";
    var testDeprecatedKitInfo: tacoKits.IKitInfo = {
        "cordova-cli": "4.0.0",
        "taco-min": "1.0.0",
        releaseNotesUri: "http://cordova.apache.org/4.0.0/release.md",
        deprecated: true,
        deprecatedReasonUri: "http://cordova.apache.org/blog/2014102310023",
        plugins: {
            "cordova-plugin-camera": {
                version: "1.0.1",
                "supported-platforms": "ios, android, wp8"
            },
            "cordova-plugin-media-capture": {
                version: "1.0.1",
                "supported-platforms": "ios, android, windows, windows8"
            }
        }
    };

    var templateSrcPath = path.resolve(__dirname, "..", "templates", "5.0.0-Kit", "blank.zip");
    var testTemplateOverrideInfo: tacoKits.ITemplateOverrideInfo = {
        kitId: "5.0.0-Kit",
        templateInfo: {
            name: "BlankTemplateName",
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
        "cordova-plugin-camera": {
            version: "1.0.1"
        }
    };

    var testDefaultKitInfo: tacoKits.IKitInfo = {
        "cordova-cli": "5.0.0",
        "taco-min": "1.0.0",
        default: true,
        releaseNotesUri: "http://cordova.apache.org/5.0.0/release.md",
        platforms: testPlatformOverridesForDefaultKit,
        plugins: testPluginOverridesForDefaultKit,
        name: "5.0.0-Kit",
        description: "5.0.0-Kit-desc"
    };

    before(function (): void {
        // Set ResourcesManager to test mode
        process.env["TACO_UNIT_TEST"] = true;
        
        // Set the kit metadata file location
        kitHelper.KitMetadataFilePath = testMetadataPath;
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
                .then(function (kitMetadata: tacoKits.ITacoKitMetadata): void {
                    // Verify the returned kit metadata is expected
                    kitMetadata.should.equal(require(kitHelper.KitMetadataFilePath));
                    done();
                })
                .catch(function (err: string): void {
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
                })
                .catch(function (err: string): void {
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
                })
                .catch(function (err: string): void {
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
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("getPlatformOverridesForKit()", function (): void {
        it("must return the platform overrides of the specified kit", function (done: MochaDone): void {
            // Call getDefaultKit() to get the default kitId and pass it as param to getPlatformOverridesForKit
            kitHelper.getDefaultKit()
                .then(kitHelper.getPlatformOverridesForKit)
                .then(function (platformOverrides: TacoKits.IPlatformOverrideMetadata): void {
                    // Verify the returned override info is correct
                    JSON.stringify(platformOverrides).should.equal(JSON.stringify(testPlatformOverridesForDefaultKit));
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });          
        });
    });

    describe("getPluginOverridesForKit()", function (): void {
        it("must return the plugin overrides of the specified kit", function (done: MochaDone): void {
            // Call getDefaultKit() to get the default kitId and pass it as param to getPluginOverridesForKit
            kitHelper.getDefaultKit()
                .then(kitHelper.getPluginOverridesForKit)
                .then(function (pluginOverrides: TacoKits.IPluginOverrideMetadata): void {
                    // Verify the returned override info is correct
                    JSON.stringify(pluginOverrides).should.equal(JSON.stringify(testPluginOverridesForDefaultKit));
                    done();
                }).catch(function (err: string): void {
                    done(new Error(err));
                });
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

    describe("getTemplatesForKit()", function (): void {
        it("should return the correct list of templates when no kit is specified", function (done: MochaDone): void {
            // The default kit in the test metadata is 5.0.0-Kit, so we expect the result to be the 5.0.0-Kit templates override
            var kitId: string = null;
            var expectedResult: TacoKits.IKitTemplatesOverrideInfo = {
                kitId: "5.0.0-Kit",
                templates: [
                    {
                        kitId: "5.0.0-Kit",
                        templateId: "blank",
                        templateInfo: {
                            name: "BlankTemplateName",
                            url: "templates/5.0.0-Kit/blank.zip"
                        }
                    }
                ]
            };

            kitHelper.getTemplatesForKit(kitId)
                .then(function (kitOverride: TacoKits.IKitTemplatesOverrideInfo): void {
                    // Verify the returned override info is correct
                    var stringifiedInfo = JSON.stringify(kitOverride);

                    stringifiedInfo.should.equal(JSON.stringify(expectedResult));
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });

        it("should return the correct list of templates for a kit that doesn't have a template override node in the metadata", function (done: MochaDone): void {
            var kitId: string = "4.2.0-Kit";
            var expectedResult: TacoKits.IKitTemplatesOverrideInfo = {
                kitId: "default",
                templates: [
                    {
                        kitId: "default",
                        templateId: "blank",
                        templateInfo: {
                            name: "BlankTemplateName",
                            url: "templates/default/blank.zip"
                        }
                    },
                    {
                        kitId: "default",
                        templateId: "typescript",
                        templateInfo: {
                            name: "TypescriptTemplateName",
                            url: "templates/default/typescript.zip"
                        }
                    }
                ]
            };

            kitHelper.getTemplatesForKit(kitId)
                .then(function (kitOverride: TacoKits.IKitTemplatesOverrideInfo): void {
                    // Verify the returned override info is correct
                    var stringifiedInfo = JSON.stringify(kitOverride);

                    stringifiedInfo.should.equal(JSON.stringify(expectedResult));
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });

        it("should return the correct list of templates for a kit that has a template override node in the metadata", function (done: MochaDone): void {
            var kitId: string = "5.0.0-Kit";
            var expectedResult: TacoKits.IKitTemplatesOverrideInfo = {
                kitId: "5.0.0-Kit",
                templates: [
                    {
                        kitId: "5.0.0-Kit",
                        templateId: "blank",
                        templateInfo: {
                            name: "BlankTemplateName",
                            url: "templates/5.0.0-Kit/blank.zip"
                        }
                    }
                ]
            };

            kitHelper.getTemplatesForKit(kitId)
                .then(function (kitOverride: TacoKits.IKitTemplatesOverrideInfo): void {
                    // Verify the returned override info is correct
                    var stringifiedInfo = JSON.stringify(kitOverride);

                    stringifiedInfo.should.equal(JSON.stringify(expectedResult));
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });

        it("should return the correct error when asking for the templates of a kit that doesn't exist", function (done: MochaDone): void {
            var kitId: string = "unknown";

            kitHelper.getTemplatesForKit(kitId)
                .then(function (kitOverride: TacoKits.IKitTemplatesOverrideInfo): void {
                    done(new Error("The method should have thrown an error, but it succeeeded"));
                }, function (err: tacoUtils.TacoError): void {
                    err.errorCode.should.be.exactly(TacoErrorCodes.TacoKitsExceptionInvalidKit);
                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("getAllTemplates()", function (): void {
        it("should return the correct list of all available templates", function (done: MochaDone): void {
            var kitId: string = null;
            var expectedResult: TacoKits.ITemplateOverrideInfo[] = [
                {
                    kitId: "default",
                    templateId: "blank",
                    templateInfo: {
                        name: "BlankTemplateName",
                        url: "templates/default/blank.zip"
                    }
                },
                {
                    kitId: "default",
                    templateId: "typescript",
                    templateInfo: {
                        name: "TypescriptTemplateName",
                        url: "templates/default/typescript.zip"
                    }
                }
            ];

            kitHelper.getAllTemplates()
                .then(function (returnedResults: TacoKits.ITemplateOverrideInfo[]): void {
                    // Verify the returned array is of the expected size
                    returnedResults.length.should.be.exactly(expectedResult.length);

                    // Verify the returned array has an entry for each template id
                    expectedResult.forEach(function (expectedTemplateInfo: TacoKits.ITemplateOverrideInfo): void {
                        var foundExpectedResult: boolean = returnedResults.some(function (returnedTemplateInfo: TacoKits.ITemplateOverrideInfo): boolean {
                            return expectedTemplateInfo.templateId === returnedTemplateInfo.templateId;
                        });

                        foundExpectedResult.should.be.true;
                    });

                    done();
                })
                .catch(function (err: string): void {
                    done(new Error(err));
                });
        });
    });

    describe("TacoKitMetaData.json", function (): void {
        it("should only have kit ids that are suitable for directory names", function (): void {
            var metadata: TacoKits.ITacoKitMetadata = require(realMetadataPath);

            for (var kitId in metadata.kits) {
                // Make sure we don't perform our check on objects added in the prototype
                if (metadata.kits.hasOwnProperty(kitId)) {
                    utilHelper.isPathValid(kitId).should.be.true;
                }
            }
        });

        it("should only have template ids that are suitable for directory names", function (): void {
            var metadata: TacoKits.ITacoKitMetadata = require(realMetadataPath);

            for (var templateId in metadata.templates) {
                // Make sure we don't perform our check on objects added in the prototype
                if (metadata.kits.hasOwnProperty(templateId)) {
                    utilHelper.isPathValid(templateId).should.be.true;
                }
            }
        });
    });
});