/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../typings/dependencyInstallerInterfaces.d.ts" />

"use strict";

import fs = require ("fs");
import os = require ("os");
import path = require ("path");

class DependencyDataWrapper {
    private static DataFile: string = path.resolve(__dirname, "..", "dependencies.json");

    private dependenciesData: DependencyInstallerInterfaces.IDependencyDictionary;
    private systemPlatform: string;

    constructor() {
        this.dependenciesData = JSON.parse(fs.readFileSync(DependencyDataWrapper.DataFile, "utf8"));
        this.systemPlatform = os.platform();
    }

    /*
     * Returns the installation destination for the specified dependency id, version id and platform id (or the current system platform if no platform is specified).
     * Will return null if the info is missing from our metadata or if either the dependency id, the version id or the platform id does not exist.
     */
    public getInstallDirectory(id: string, version: string, platform: string = this.systemPlatform): string {
        if (this.dependenciesData[id] && this.dependenciesData[id].versions[version] && this.dependenciesData[id].versions[version][platform]) {
            return this.dependenciesData[id].versions[version][platform].installDestination;
        }

        return null;
    }

    /*
     * Returns the display name for the specified dependency. Will return null if the info is missing in our metadata or if the dependency does not exist.
     */
    public getDisplayName(id: string): string {
        if (this.dependenciesData[id]) {
            return this.dependenciesData[id].displayName;
        }

        return null;
    }

    /*
     * Returns the license url for the specified dependency. Will return null if the info is missing in our metadata or if the dependency does not exist.
     */
    public getLicenseUrl(id: string): string {
        if (this.dependenciesData[id]) {
            return this.dependenciesData[id].licenseUrl;
        }

        return null;
    }

    /*
     * Returns the list of prerequisites for the specified dependency. Will return null if the info is missing in our metadata or if the dependency does not exist.
     */
    public getPrerequisites(id: string): string[] {
        if (this.dependenciesData[id]) {
            return this.dependenciesData[id].prerequisites;
        }

        return null;
    }

    /*
     * Returns the installer info for the specified dependency. Will return null if either the dependency id, the version id or the platform (or the current system
     * platform if no platform is specified) id does not exist.
     */
    public getInstallerInfo(id: string, version: string, platform: string = this.systemPlatform): DependencyInstallerInterfaces.IInstallerData {
        if (this.dependenciesData[id] && this.dependenciesData[id].versions[version]) {
            return this.dependenciesData[id].versions[version][platform];
        }

        return null;
    }

    /*
     * Returns true if the specified dependency exists, false otherwise.
     */
    public dependencyExists(id: string): boolean {
        return !!this.dependenciesData[id];
    }

    /*
     * Returns true if the specified dependency has a node for the specified version, false otherwise.
     */
    public versionExists(id: string, version: string): boolean {
        return !!this.dependenciesData[id] && !!this.dependenciesData[id].versions[version];
    }

    /*
     * Returns true if the specified dependency has a node for the specified version and that version has a node for the specified platform (or the current system
     * platform if no platform is specified), false otherwise.
     */
    public platformExistsForVersion(id: string, version: string, platform: string): boolean {
        return !!this.dependenciesData[id] && !!this.dependenciesData[id].versions[version] && !!this.dependenciesData[id].versions[version][platform];
    }

    /*
     * Returns true if the specified dependency has a node for the specified version and that version has a node for either the specified platform (or the current
     * system platform if no platform is specified), or the "default" platform. Returns false otherwise.
     */
    public isSystemSupported(id: string, version: string, platform: string = this.systemPlatform): boolean {
        return this.platformExistsForVersion(id, version, platform) || this.platformExistsForVersion(id, version, "default");
    }

    /*
     * Looks into the specified dependency node and returns the first version id that contains a node for either the specified platform (or the current system
     * platform if no platform is specified) or the "default" platform. Returns null if no such version id exists.
     */
    public firstValidVersion(id: string, platform: string = this.systemPlatform): string {
        var validVersion: string = null;

        for (var version in this.dependenciesData[id].versions) {
            if (this.dependenciesData[id].versions.hasOwnProperty(version)) {
                if (this.isSystemSupported(id, version, platform)) {
                    validVersion = version;
                    break;
                }
            }
        }

        return validVersion;
    }

    /*
     * Returns true if the first specified dependency depends on the second one, false if not. Searches recursively. Will also return false if either of the
     * specified dependencies does not exist in our metadata.
     */
    public dependsOn(a: string, b: string): boolean {
        // TODO make a depth-first search to recursively check dependents
        if (!this.dependenciesData[a] || !this.dependenciesData[b]) {
            return false;
        }

        return this.dependenciesData[a].prerequisites.indexOf(b) !== -1;
    }
}

export = DependencyDataWrapper;