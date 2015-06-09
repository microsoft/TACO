/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />

import Q = require ("q");
import path = require ("path");
import fs = require ("fs");

import resources = require ("../../resources/resourceManager");
import tacoKits = require ("taco-kits");
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");

import kitHelper = tacoKits.KitHelper;

/**
 *  A helper class with methods to query the project root, project info like CLI/kit version etc.
 */
class ProjectHelper {
    private static TacoJsonFileName: string = "taco.json";

    /**
     *  Helper to create the taco.json file in the project root {projectPath}. Invoked by
     *  the create command handler after the actual project creation  
     */
    public static createTacoJsonFile(projectPath: string, isKitProject: boolean, versionValue: string): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var tacoJsonPath: string = path.resolve(projectPath, ProjectHelper.TacoJsonFileName);
        if (isKitProject) {
            if (!versionValue) {
                return kitHelper.getDefaultKit().then(function (kitId: string): Q.Promise<any> {
                    return ProjectHelper.createTacoJsonFileWithContents(tacoJsonPath, { kit: kitId });
                });
            } else {
                return ProjectHelper.createTacoJsonFileWithContents(tacoJsonPath, { kit: versionValue });
            }
        } else {
            if (!versionValue) {
                deferred.reject(errorHelper.get(TacoErrorCodes.CommandCreateTacoJsonFileCreationError));
                return deferred.promise;
            }

            return ProjectHelper.createTacoJsonFileWithContents(tacoJsonPath, { cli: versionValue });
        }
    }

    /**
     *  Helper to find the root of the project. Invoked by taco command handlers to detect
     *  the project root directory. Returns null in the case of directories which are
     *  not cordova-based projects. Otherwise, the project root path as string.
     */
    public static getProjectRoot(): string {
        var projectPath: string = process.cwd();
        var parentPath: string;
        var atFsRoot: boolean = false;
        while (fs.existsSync(projectPath) && !fs.existsSync(path.join(projectPath, ProjectHelper.TacoJsonFileName))) {
            // Navigate up one level until either taco.json is found or the parent path is invalid
            parentPath = path.resolve(projectPath, "..");
            if (parentPath !== projectPath) {
                projectPath = parentPath;
            } else {
                // we have reached the filesystem root
                atFsRoot = true;
                break;
            }
        }

        if (atFsRoot) {
            // We reached the fs root, so the project path passed was not a Cordova-based project directory
            return null;
        }

        return projectPath;
    }

    /**
     * Helper function to change the current directory to the project root, if possible.
     * If we can't find a taco.json then it will not change directory
     */
    public static cdToProjectRoot(): void {
        var tacoRoot = ProjectHelper.getProjectRoot();
        if (tacoRoot) {
            process.chdir(tacoRoot);
            // Cordova checks for process.env.PWD before checkign process.cwd, and process.env.PWD is not changed by process.chdir()
            // If we happened to be in a scenario where a taco project contained a separate cordova project, this way we ensure that
            // both taco and cordova will operate on the same project rather than our own taco stuff modifying things in tacoRoot and
            // cordova commands modifying things somewhere else.
            process.env.PWD = tacoRoot;
        }
    }

    /**
     *  Helper to get info regarding the current project.  
     *  An object of type IProjectInfo is returned to the caller.
     */
    public static getProjectInfo(): Q.Promise<ProjectHelper.IProjectInfo> {
        var deferred: Q.Deferred<ProjectHelper.IProjectInfo> = Q.defer<ProjectHelper.IProjectInfo>();
        var projectInfo: ProjectHelper.IProjectInfo = {
            isTacoProject: false,
            cordovaCliVersion: "",
            tacoKitId: ""
        };

        var projectPath = ProjectHelper.getProjectRoot();
        try {
            if (!projectPath) {
                deferred.resolve(projectInfo);
                return deferred.promise;
            }

            var tacoJson: ProjectHelper.ITacoJsonMetadata = require(path.join(projectPath, ProjectHelper.TacoJsonFileName));
            if (tacoJson.kit) {
                kitHelper.getValidCordovaCli(projectInfo.tacoKitId).then(function (cordovaCli: string): void {
                    projectInfo.isTacoProject = true;
                    projectInfo.tacoKitId = tacoJson.kit;
                    projectInfo.cordovaCliVersion = cordovaCli;
                    deferred.resolve(projectInfo);
                });
            } else if (tacoJson.cli) {
                projectInfo.isTacoProject = true;
                projectInfo.cordovaCliVersion = tacoJson.cli;
                deferred.resolve(projectInfo);
            } else {
                deferred.resolve(projectInfo);
            }
        } catch (e) {
            deferred.reject(errorHelper.get(TacoErrorCodes.ErrorTacoJsonMissingOrMalformed));
        }

        return deferred.promise;
    }

    public static getCordovaVersion(): Q.Promise<string> {
        return ProjectHelper.getProjectInfo().then(function (projectInfo: ProjectHelper.IProjectInfo): Q.Promise<string> {
            if (projectInfo.cordovaCliVersion) {
                return Q.resolve(projectInfo.cordovaCliVersion);
            } else {
                // projectHelper.ts is require'd by cordovaWrapper.ts, and we want to avoid cyclic dependencies. Thus we delay the require until necessary.
                var cordovaWrapper = require("./cordovaWrapper");
                return cordovaWrapper.cli(["-v"], true).then(function (output: string): string {
                    return output.split("\n")[0];
                });
            }
        });
    }

    /**
     *  Private helper that serializes the JSON blob {jsonData} passed to a file @ {tacoJsonPath}
     */
    private static createTacoJsonFileWithContents(tacoJsonPath: string, jsonData: any): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        fs.writeFile(tacoJsonPath, JSON.stringify(jsonData), function (err: NodeJS.ErrnoException): void {
            if (err) {
                deferred.reject(errorHelper.wrap(TacoErrorCodes.CommandCreateTacoJsonFileWriteError, err, tacoJsonPath));
            }

            deferred.resolve({});
        });
        return deferred.promise;
    }
}

module ProjectHelper {
    export interface ITacoJsonMetadata {
        kit?: string;
        cli?: string;
    }

    export interface IProjectInfo {
        isTacoProject: boolean;
        cordovaCliVersion: string;
        tacoKitId?: string;
    }
}

export = ProjectHelper;
