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
    private static defaultDependenciesMetadataFilePath: string = path.resolve(__dirname, "..", "platformDependencies.json");

    private dependencies: DependencyInstallerInterfaces.IDependencyDictionary;
    private unsupported: DependencyInstallerInterfaces.IUnsupportedDictionary;

    constructor(dependenciesMetadataFilePath?: string) {
        var loadPath: string = dependenciesMetadataFilePath || DependencyDataWrapper.defaultDependenciesMetadataFilePath;

        var metadata: DependencyInstallerInterfaces.IDependencyInstallerMetadata = JSON.parse(fs.readFileSync(loadPath, "utf8"));

        this.dependencies = metadata.dependencies;
        this.unsupported = metadata.unsupported;
    }

    /*
     * Returns the installation destination for the specified dependency ID, version ID and platform ID (or the current system platform if no platform is specified).
     * Will return null if the info is missing from our metadata or if either the dependency ID, the version ID or the platform ID does not exist.
     */
    public getInstallDirectory(id: string, version: string, platform: string = process.platform, architecture: string = os.arch()): string {
        if (this.isSystemSupported(id, version, platform, architecture)) {
            return this.dependencies[id].versions[version][platform][architecture].installDestination;
        }

        return null;
    }

    /*
     * Returns the display name for the specified dependency. Will return null if the info is missing in our metadata or if the dependency does not exist.
     */
    public getDisplayName(id: string): string {
        if (this.dependencyExists(id)) {
            return this.dependencies[id].displayName;
        }

        return null;
    }

    /*
     * Returns the path to the specialized installer class of the specified dependency, or null if the dependency doesn't exist.
     */
    public getInstallerPath(id: string): string {
        if (this.dependencyExists(id)) {
            return this.dependencies[id].installerPath;
        }

        return null;
    }

    /*
     * Returns the license url for the specified dependency. Will return null if the info is missing in our metadata or if the dependency does not exist.
     */
    public getLicenseUrl(id: string): string {
        if (this.dependencyExists(id)) {
            return this.dependencies[id].licenseUrl;
        }

        return null;
    }

    /*
     * Returns the list of prerequisites for the specified dependency. Will return null if the info is missing in our metadata or if the dependency does not exist.
     */
    public getPrerequisites(id: string): string[] {
        if (this.dependencyExists(id)) {
            return this.dependencies[id].prerequisites;
        }

        return null;
    }

    /*
     * Returns the installer info for the specified dependency. Will return null if either the dependency ID, the version ID or the platform (or the current system
     * platform if no platform is specified) ID does not exist.
     */
    public getInstallerInfo(id: string, version: string, platform: string = process.platform, architecture: string = os.arch()): DependencyInstallerInterfaces.IInstallerData {
        if (this.isSystemSupported(id, version, platform, architecture)) {
            // We don't want to return the steps declaration, as this is for internal use, so we manually construct an IInstallerData while skipping the steps declaraion
            var infoSource: DependencyInstallerInterfaces.IInstallerData = this.dependencies[id].versions[version][platform][architecture];
            var infoResult: DependencyInstallerInterfaces.IInstallerData = {
                installSource: infoSource.installSource,
                sha1: infoSource.sha1,
                bytes: infoSource.bytes
            };

            if (infoSource.installDestination) {
                infoResult.installDestination = infoSource.installDestination;
            }

            return infoResult;
        }

        return null;
    }

    /*
     * Returns the installer steps for the specified dependency. Will return null if either the dependency ID, the version ID or the platform (or the current system
     * platform if no platform is specified) ID does not exist.
     */
    public getInstallerSteps(id: string, version: string, platform: string = process.platform, architecture: string = os.arch()): DependencyInstallerInterfaces.IStepsDeclaration {
        if (this.isSystemSupported(id, version, platform, architecture)) {
            return this.dependencies[id].versions[version][platform][architecture].steps;
        }

        return null;
    }

    /*
     * Looks into the specified dependency node and returns the first version ID that contains a node for either the specified platform (or the current system
     * platform if no platform is specified) or the "default" platform. Returns null if no such version ID exists.
     */
    public getFirstValidVersion(id: string, platform: string = process.platform, architecture: string = os.arch()): string {
        var self = this;
        var validVersion: string;

        if (this.dependencyExists(id) && !!this.dependencies[id].versions) {
            Object.keys(this.dependencies[id].versions).some(function (version: string): boolean {
                if (self.isSystemSupported(id, version, platform, architecture)) {
                    validVersion = version;

                    return true;
                }

                return false;
            });
        }

        return validVersion;
    }

    /*
     * Returns the link for the help of the specified known unsupported dependency, or null if the dependency is not a known unsupported or if it doesn't have any help link.
     */
    public getInstallHelp(id: string): string {
        if (this.isKnownUnsupported(id)) {
            return this.unsupported[id].installHelp;
        }

        return null;
    }

    /*
     * Returns true if the specified dependency exists, false otherwise.
     */
    public dependencyExists(id: string): boolean {
        return !!this.dependencies[id];
    }

    /*
     * Returns true if the specified dependency has a node for the specified version, false otherwise.
     */
    public versionExists(id: string, version: string): boolean {
        return this.dependencyExists(id) &&
            !!this.dependencies[id].versions &&
            !!this.dependencies[id].versions[version];
    }

    /*
     * Returns true if the specified dependency has a node for the specified version and that version has a node for either the specified platform (or the current
     * system platform if no platform is specified), or the "default" platform. Returns false otherwise.
     */
    public isSystemSupported(id: string, version: string, platform: string = process.platform, architecture: string = os.arch()): boolean {
        return this.versionExists(id, version) &&
            !!this.dependencies[id].versions[version][platform] &&
            !!this.dependencies[id].versions[version][platform][architecture];
    }

    /*
     * Returns true if the specified dependency is implicit, false if it isn't or if the specified ID does not exist. A dependency is implicit if it is installed as part of a different dependency. For
     * example, Android packages (android-21, android-platform-tools, etc) are installed directly as part of installing Android SDK in this dependency installer, so we don't want to do extra processing
     * to handle these packages specifically. Thus, they are marked as implicit dependencies.
     */
    public isImplicit(id: string): boolean {
        return this.dependencyExists(id) && !!this.dependencies[id].isImplicit;
    }

    /*
     * Returns true if the specified dependency is known to be unsupported, false otherwise.
     */
    public isKnownUnsupported(id: string): boolean {
        return !!this.unsupported[id];
    }
}

export = DependencyDataWrapper;
