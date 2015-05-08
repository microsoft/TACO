/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/Q.d.ts" />

import Q = require ("q");
import path = require ("path");
import fs = require ("fs");

import resources = require ("../../resources/resourceManager");
import tacoKits = require ("taco-kits");
import tacoUtility = require ("taco-utils");

import kitHelper = tacoKits.KitHelper;

class TacoProjectHelper {
    public static createTacoJsonFile(projectPath: string, isKitProject: boolean, versionValue: string): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        var tacoJsonPath: string = path.resolve(projectPath, "taco.json");
        if (isKitProject) {
            if (!versionValue) {
                return kitHelper.getDefaultKit().then(function (kitId: string): Q.Promise<any> {
                    return TacoProjectHelper.createJsonFileWithContents(tacoJsonPath, { kit: kitId });
                });
            } else {
                return TacoProjectHelper.createJsonFileWithContents(tacoJsonPath, { kit: versionValue });
            }
        } else {
            if (!versionValue) {
                deferred.reject(resources.getString("commandCreateTacoJsonFileCreationError"));
                return deferred.promise;
            }

            return TacoProjectHelper.createJsonFileWithContents(tacoJsonPath, { cli: versionValue });
        }
    }

    private static createJsonFileWithContents(tacoJsonPath: string, jsonData: any): Q.Promise<any> {
        var deferred: Q.Deferred<any> = Q.defer<any>();
        fs.writeFile(tacoJsonPath, JSON.stringify(jsonData), function (err: NodeJS.ErrnoException): void {
            if (err) {
                deferred.reject(err);
            }

            deferred.resolve({});
        });
        return deferred.promise;
    }
}

export = TacoProjectHelper;
