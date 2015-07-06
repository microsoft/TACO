/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />
/// <reference path="../../typings/mocha.d.ts"/>
/// <reference path="../../typings/should.d.ts"/>

"use strict";

var should_module = require("should"); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

import path = require ("path");

import DependencyDataWrapper = require ("../utils/dependencyDataWrapper");

import IInstallerData = DependencyInstallerInterfaces.IInstallerData;

describe("DependencyDataWrapper", function (): void {
    // Important paths
    var testMetadataFile: string = path.resolve(__dirname, "test-data", "testMetadata.json");

    // Persistent dependency data wrapper instance
    var dependencyDataWrapper: DependencyDataWrapper;

    // Utility functions
    function assertDoesNotExist(obj: any): void {
        (!!obj).should.be.false;
    }

    function assertArraysAreEqual(expected: string[], actual: string[]): void {
        expected.length.should.be.exactly(actual.length);

        expected.forEach(function (value: string): void {
            actual.indexOf(value).should.not.be.exactly(-1);
        });
    }

    function assertObjectsAreEqual(expected: any, actual: any): void {
        JSON.stringify(expected).should.be.exactly(JSON.stringify(actual));
    }

    before(function (): void {
        // Instantiate the persistent DependencyInstaller
        dependencyDataWrapper = new DependencyDataWrapper(testMetadataFile);
    });

    describe("getInstallDirectory()", function (): void {
        it("should return the correct install destination for a dependency", function (): void {
            var expectedResult1: string = "installDestination_1_1.0_win32_ia32";
            var expectedResult2: string = "installDestination_1_1.0_win32_x64";
            var expectedResult3: string = "installDestination_1_1.0_darwin_ia32";
            var expectedResult4: string = "installDestination_1_2.0_darwin_x64";

            var installDir1: string = dependencyDataWrapper.getInstallDirectory("dependency1", "1.0", "win32", "ia32");
            var installDir2: string = dependencyDataWrapper.getInstallDirectory("dependency1", "1.0", "win32", "x64");
            var installDir3: string = dependencyDataWrapper.getInstallDirectory("dependency1", "1.0", "darwin", "ia32");
            var installDir4: string = dependencyDataWrapper.getInstallDirectory("dependency1", "2.0", "darwin", "x64");

            installDir1.should.be.exactly(expectedResult1);
            installDir2.should.be.exactly(expectedResult2);
            installDir3.should.be.exactly(expectedResult3);
            installDir4.should.be.exactly(expectedResult4);
        });

        it("should not give errors when no install destination is available", function (): void {
            var installDir1: string = dependencyDataWrapper.getInstallDirectory("dependency2", "1.0");
            var installDir2: string = dependencyDataWrapper.getInstallDirectory("dependency4", "1.0");
            var installDir3: string = dependencyDataWrapper.getInstallDirectory("dependency6", "1.0");
            var installDir4: string = dependencyDataWrapper.getInstallDirectory("dependency1", "unknown");
            var installDir5: string = dependencyDataWrapper.getInstallDirectory("unknown", "unknown");

            assertDoesNotExist(installDir1);
            assertDoesNotExist(installDir2);
            assertDoesNotExist(installDir3);
            assertDoesNotExist(installDir4);
            assertDoesNotExist(installDir5);
        });
    });

    describe("getDisplayName()", function (): void {
        it("should return the correct display name for a dependency", function (): void {
            var expectedResult1: string = "displayName_1";
            var expectedResult2: string = "displayName_5";

            var displayName1: string = dependencyDataWrapper.getDisplayName("dependency1");
            var displayName2: string = dependencyDataWrapper.getDisplayName("dependency5");

            displayName1.should.be.exactly(expectedResult1);
            displayName2.should.be.exactly(expectedResult2);
        });

        it("should not give errors for dependencies that don't have a display name", function (): void {
            var displayName1: string = dependencyDataWrapper.getDisplayName("dependency2");
            var displayName2: string = dependencyDataWrapper.getDisplayName("unknown");

            assertDoesNotExist(displayName1);
            assertDoesNotExist(displayName2);
        });
    });

    describe("getInstallerPath()", function (): void {
        it("should return the correct installer path for a dependency", function (): void {
            var expectedResult: string = "./installers/installerBase";

            var installerPath: string = dependencyDataWrapper.getInstallerPath("dependency1");

            installerPath.should.be.exactly(expectedResult);
        });

        it("should not give errors for dependencies that don't have an installer path", function (): void {
            var installerPath1: string = dependencyDataWrapper.getInstallerPath("dependency2");
            var installerPath2: string = dependencyDataWrapper.getInstallerPath("unknown");

            assertDoesNotExist(installerPath1);
            assertDoesNotExist(installerPath2);
        });
    });

    describe("getLicenseUrl()", function (): void {
        it("should return the correct license URL for a dependency", function (): void {
            var expectedResult1: string = "licenseUrl_1";
            var expectedResult2: string = "licenseUrl_4";

            var licenseUrl1: string = dependencyDataWrapper.getLicenseUrl("dependency1");
            var licenseUrl2: string = dependencyDataWrapper.getLicenseUrl("dependency4");

            licenseUrl1.should.be.exactly(expectedResult1);
            licenseUrl2.should.be.exactly(expectedResult2);
        });

        it("should not give errors for dependencies that don't have a license URL", function (): void {
            var licenseUrl1: string = dependencyDataWrapper.getLicenseUrl("dependency2");
            var licenseUrl2: string = dependencyDataWrapper.getLicenseUrl("dependency7");

            assertDoesNotExist(licenseUrl1);
            assertDoesNotExist(licenseUrl2);
        });
    });

    describe("getPrerequisites()", function (): void {
        it("should return the correct prerequisites list for a dependency", function (): void {
            var expectedResult1: string[] = ["dependency5", "dependency7"];
            var expectedResult2: string[] = [];
            var expectedResult3: string[] = ["dependency5", "dependency6"];

            var prerequisites1: string[] = dependencyDataWrapper.getPrerequisites("dependency1");
            var prerequisites2: string[] = dependencyDataWrapper.getPrerequisites("dependency4");
            var prerequisites3: string[] = dependencyDataWrapper.getPrerequisites("dependency7");

            assertArraysAreEqual(expectedResult1, prerequisites1);
            assertArraysAreEqual(expectedResult2, prerequisites2);
            assertArraysAreEqual(expectedResult3, prerequisites3);
        });

        it("should not give errors for dependencies that don't have a prerequisites list", function (): void {
            var prerequisites1: string[] = dependencyDataWrapper.getPrerequisites("dependency2");
            var prerequisites2: string[] = dependencyDataWrapper.getPrerequisites("unknown");

            assertDoesNotExist(prerequisites1);
            assertDoesNotExist(prerequisites2);
        });
    });

    describe("getInstallerInfo()", function (): void {
        it("should return the correct installer info for a dependency", function (): void {
            var expectedResult1: IInstallerData = {
                installSource: "installSource_1_1.0_win32_ia32",
                sha1: "sha1_1_1.0_win32_ia32",
                bytes: 0,
                installDestination: "installDestination_1_1.0_win32_ia32"
            };
            var expectedResult2: IInstallerData = {
                installSource: "installSource_1_2.0_darwin_x64",
                sha1: "sha1_1_2.0_darwin_x64",
                bytes: 0,
                installDestination: "installDestination_1_2.0_darwin_x64"
            };
            var expectedResult3: IInstallerData = {
                installSource: "installSource_5_1.0_win32_x64",
                sha1: "sha1_5_1.0_win32_x64",
                bytes: 0,
                installDestination: "installDestination_5_1.0_win32_x64"
            };
            var expectedResult4: IInstallerData = {
                installSource: "installSource_7_1.0_darwin_ia32",
                sha1: "sha1_7_1.0_darwin_ia32",
                bytes: 0,
                installDestination: "installDestination_5_1.0_darwin_ia32"
            };

            var installerData1: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency1", "1.0", "win32", "ia32");
            var installerData2: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency1", "2.0", "darwin", "x64");
            var installerData3: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency5", "1.0", "win32", "x64");
            var installerData4: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency7", "1.0", "darwin", "ia32");

            assertObjectsAreEqual(expectedResult1, installerData1);
            assertObjectsAreEqual(expectedResult2, installerData2);
            assertObjectsAreEqual(expectedResult3, installerData3);
            assertObjectsAreEqual(expectedResult4, installerData4);
        });

        it("should not give errors when no installer info is available", function (): void {
            var installerData1: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency2", "1.0");
            var installerData2: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency4", "1.0");
            var installerData3: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency6", "1.0");
            var installerData4: IInstallerData = dependencyDataWrapper.getInstallerInfo("dependency1", "unknown");
            var installerData5: IInstallerData = dependencyDataWrapper.getInstallerInfo("unknown", "unknown");

            assertDoesNotExist(installerData1);
            assertDoesNotExist(installerData2);
            assertDoesNotExist(installerData3);
            assertDoesNotExist(installerData4);
            assertDoesNotExist(installerData5);
        });
    });

    describe("getFirstValidVersion()", function (): void {
        it("should return the correct version info for a dependency", function (): void {
            var expectedResult1: string = "1.0";
            var expectedResult2: string = "1.0";

            var version1: string = dependencyDataWrapper.getFirstValidVersion("dependency1", "win32", "ia32");
            var version2: string = dependencyDataWrapper.getFirstValidVersion("dependency7", "darwin", "x64");

            expectedResult1.should.be.exactly(version1);
            expectedResult2.should.be.exactly(version2);
        });

        it("should not give errors when no version is supported for the current system", function (): void {
            var version1: string = dependencyDataWrapper.getFirstValidVersion("dependency1", "win32", "unknown");
            var version2: string = dependencyDataWrapper.getFirstValidVersion("dependency7", "unknown", "x64");
            var version3: string = dependencyDataWrapper.getFirstValidVersion("unknown", "win32", "x64");
            var version4: string = dependencyDataWrapper.getFirstValidVersion("dependency2", "win32", "x64");
            var version5: string = dependencyDataWrapper.getFirstValidVersion("dependency4", "win32", "x64");
            var version6: string = dependencyDataWrapper.getFirstValidVersion("dependency6", "win32", "x64");

            assertDoesNotExist(version1);
            assertDoesNotExist(version2);
            assertDoesNotExist(version3);
            assertDoesNotExist(version4);
            assertDoesNotExist(version5);
            assertDoesNotExist(version6);
        });
    });

    describe("dependencyExists()", function (): void {
        it("should correctly detect whether a dependency exists or not in our metadata", function (): void {
            var expectedResult1: boolean = true;
            var expectedResult2: boolean = false;

            var exists1: boolean = dependencyDataWrapper.dependencyExists("dependency1");
            var exists2: boolean = dependencyDataWrapper.dependencyExists("unknown");

            exists1.should.be.exactly(expectedResult1);
            exists2.should.be.exactly(expectedResult2);
        });
    });

    describe("versionExists()", function (): void {
        it("should correctly detect whether a version exists or not in our metadata", function (): void {
            var expectedResult1: boolean = true;
            var expectedResult2: boolean = true;
            var expectedResult3: boolean = false;
            var expectedResult4: boolean = false;
            var expectedResult5: boolean = false;
            var expectedResult6: boolean = true;
            var expectedResult7: boolean = false;

            var exists1: boolean = dependencyDataWrapper.versionExists("dependency1", "1.0");
            var exists2: boolean = dependencyDataWrapper.versionExists("dependency1", "2.0");
            var exists3: boolean = dependencyDataWrapper.versionExists("dependency1", "unknown");
            var exists4: boolean = dependencyDataWrapper.versionExists("dependency2", "1.0");
            var exists5: boolean = dependencyDataWrapper.versionExists("dependency4", "1.0");
            var exists6: boolean = dependencyDataWrapper.versionExists("dependency6", "1.0");
            var exists7: boolean = dependencyDataWrapper.versionExists("unknown", "1.0");

            expectedResult1.should.be.exactly(exists1);
            expectedResult2.should.be.exactly(exists2);
            expectedResult3.should.be.exactly(exists3);
            expectedResult4.should.be.exactly(exists4);
            expectedResult5.should.be.exactly(exists5);
            expectedResult6.should.be.exactly(exists6);
            expectedResult7.should.be.exactly(exists7);
        });
    });

    describe("isSystemSupported()", function (): void {
        it("should correctly detect whether a version exists or not in our metadata", function (): void {
            var expectedResult1: boolean = true;
            var expectedResult2: boolean = true;
            var expectedResult3: boolean = false;
            var expectedResult4: boolean = false;
            var expectedResult5: boolean = false;
            var expectedResult6: boolean = true;
            var expectedResult7: boolean = false;

            var exists1: boolean = dependencyDataWrapper.isSystemSupported("dependency1", "1.0", "win32", "ia32");
            var exists2: boolean = dependencyDataWrapper.isSystemSupported("dependency1", "2.0", "win32", "ia32");
            var exists3: boolean = dependencyDataWrapper.isSystemSupported("dependency1", "unknown", "win32", "ia32");
            var exists3: boolean = dependencyDataWrapper.isSystemSupported("dependency1", "1.0", "unknown", "ia32");
            var exists3: boolean = dependencyDataWrapper.isSystemSupported("dependency1", "1.0", "win32", "unknown");
            var exists4: boolean = dependencyDataWrapper.isSystemSupported("dependency2", "1.0", "darwin", "x64");
            var exists5: boolean = dependencyDataWrapper.isSystemSupported("dependency4", "1.0", "win32", "ia32");
            var exists6: boolean = dependencyDataWrapper.isSystemSupported("dependency6", "1.0", "win32", "ia32");
            var exists7: boolean = dependencyDataWrapper.isSystemSupported("unknown", "1.0", "win32", "ia32");

            expectedResult1.should.be.exactly(exists1);
            expectedResult2.should.be.exactly(exists2);
            expectedResult3.should.be.exactly(exists3);
            expectedResult4.should.be.exactly(exists4);
            expectedResult5.should.be.exactly(exists5);
            expectedResult6.should.be.exactly(exists6);
            expectedResult7.should.be.exactly(exists7);
        });
    });
});