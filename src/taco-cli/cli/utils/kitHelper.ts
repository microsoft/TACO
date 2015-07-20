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
import TacoErrorCodes = require ("../tacoErrorCodes");
import errorHelper = require ("../tacoErrorHelper");
import tacoUtility = require ("taco-utils");
import TacoPackageLoader = tacoUtility.TacoPackageLoader;

import IKitHelper = TacoKits.IKitHelper;
import ITacoKits = TacoKits.ITacoKits;
import ITacoKitMetadata = TacoKits.ITacoKitMetadata;
import IKitInfo = TacoKits.IKitInfo;
import IPlatformOverrideMetadata = TacoKits.IPlatformOverrideMetadata;
import IPluginOverrideMetadata = TacoKits.IPluginOverrideMetadata;
import ITemplateOverrideInfo = TacoKits.ITemplateOverrideInfo;
import IKitTemplatesOverrideInfo = TacoKits.IKitTemplatesOverrideInfo;

/**
 *  A helper class with methods to query the project root, project info like CLI/kit version etc.
 */
class KitHelper {
    private static dynamicDependenciesLocation:string = path.join(__dirname, "../../dynamicDependencies.json");
    private static tacoKits:string = "taco-kits";

    public static getKitMetadata(): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<ITacoKitMetadata> {
                return tacoKits.kitHelper.getKitMetadata();
            })
            .catch(function (err: any): void {
                throw err;
            });
    }

    public static getKitInfo(kitId: string): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<IKitInfo> {
                return tacoKits.kitHelper.getKitInfo(kitId);
            })
            .catch(function (err: any): void {
                throw err;
            });
    }
    
    public static getDefaultKit(): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<string> {
                return tacoKits.kitHelper.getDefaultKit();
            })
            .catch(function (err: any): void {
                throw err;
            });
    }

    public static getValidCordovaCli(kitId: string): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<string> {
                return tacoKits.kitHelper.getValidCordovaCli(kitId);
            })
            .catch(function (err: any): void {
                throw err;
            });
    }

    public static getPlatformOverridesForKit(kitId: string): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<IPlatformOverrideMetadata> {
                return tacoKits.kitHelper.getPlatformOverridesForKit(kitId);
            })
            .catch(function (err: any): void {
                throw err;
            });
    }

    public static getPluginOverridesForKit(kitId: string): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<IPluginOverrideMetadata> {
                return tacoKits.kitHelper.getPluginOverridesForKit(kitId);
            })
            .catch(function (err: any): void {
                throw err;
            });
    }

    public static getTemplateOverrideInfo(kitId: string, templateId: string): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<ITemplateOverrideInfo> {
                return tacoKits.kitHelper.getTemplateOverrideInfo(kitId, templateId);
            })
            .catch(function (err: any): void {
                throw err;
            });
    }

    public static getTemplatesForKit(kitId: string): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<IKitTemplatesOverrideInfo> {
                return tacoKits.kitHelper.getTemplatesForKit(kitId);
            })
            .catch(function (err: any): void {
                throw err;
            });
    }
    
    public static getAllTemplates(): Q.Promise<any> {
        return TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.tacoKits, KitHelper.dynamicDependenciesLocation)
            .then(function (tacoKits: ITacoKits): Q.Promise<ITemplateOverrideInfo[]> {
                return tacoKits.kitHelper.getAllTemplates();
            })
            .catch(function (err: any): void {
                throw err;
            });
    }
}

export = KitHelper;