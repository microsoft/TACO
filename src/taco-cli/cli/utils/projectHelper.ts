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

module ProjectHelper {
    export interface ITacoJsonMetadata {
        kit?: string;
        cli?: string;
    }

    export interface IProjectInfo {
        isKitProject: boolean;
        cordovaCliVersion: string;
        tacoKitId?: string;
    }

    export class TacoProjectHelper {
        private static TacoJsonFileName: string = "taco.json";
        public static createTacoJsonFile(projectPath: string, isKitProject: boolean, versionValue: string): Q.Promise<any> {
            var deferred: Q.Deferred<any> = Q.defer<any>();
            var tacoJsonPath: string = path.resolve(projectPath, TacoProjectHelper.TacoJsonFileName);
            if (isKitProject) {
                if (!versionValue) {
                    return kitHelper.getDefaultKit().then(function (kitId: string): Q.Promise<any> {
                        return TacoProjectHelper.createTacoJsonFileWithContents(tacoJsonPath, { kit: kitId });
                    });
                } else {
                    return TacoProjectHelper.createTacoJsonFileWithContents(tacoJsonPath, { kit: versionValue });
                }
            } else {
                if (!versionValue) {
                    deferred.reject(errorHelper.get(TacoErrorCodes.CommandCreateTacoJsonFileCreationError));
                    return deferred.promise;
                }

                return TacoProjectHelper.createTacoJsonFileWithContents(tacoJsonPath, { cli: versionValue });
            }
        }

        public static getProjectInfo(projectPath: string): Q.Promise<IProjectInfo> {
            var deferred: Q.Deferred<IProjectInfo> = Q.defer<IProjectInfo>();
            var projectInfo: IProjectInfo = {
                isKitProject: false,
                cordovaCliVersion: "",
                tacoKitId: ""
            };

            var tacoJsonPath: string = path.resolve(projectPath, TacoProjectHelper.TacoJsonFileName);
            try {
                var parentPath: string;
                var atRootFolder: boolean = false;
                while (!atRootFolder && fs.existsSync(projectPath) && !fs.existsSync(path.join(projectPath, TacoProjectHelper.TacoJsonFileName))) {
                    // Navigate up one level until either taco.json is found or the parent path is invalid
                    parentPath = path.resolve(projectPath, "..");
                    if (parentPath !== projectPath) {
                        atRootFolder = true;
                        projectPath = parentPath;
                    } else {
                        break;
                    }
                }

                if (atRootFolder) {
                    // We reached the root, so the project path passed was not a Cordova-based project directory
                    deferred.resolve(projectInfo);
                    return deferred.promise;
                }
               
                var tacoJson: ITacoJsonMetadata = require(path.join(projectPath, TacoProjectHelper.TacoJsonFileName));
                if (tacoJson.kit) {
                    kitHelper.getValidCordovaCli(projectInfo.tacoKitId).then(function (cordovaCli: string): void {
                        projectInfo.isKitProject = true;
                        projectInfo.tacoKitId = tacoJson.kit;
                        projectInfo.cordovaCliVersion = cordovaCli;
                        deferred.resolve(projectInfo);
                    });
                } else if (tacoJson.cli) {
                    projectInfo.isKitProject = true;
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
}

export = ProjectHelper;
