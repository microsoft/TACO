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
    // Keeping the cached promise acessible to tests
    public static kitPackagePromise: Q.Promise<ITacoKits> = null;

    private static dynamicDependenciesLocation: string = path.join(__dirname, "../../dynamicDependencies.json");
    private static TACO_KITS_NPM_PACKAGE_NAME: string = "taco-kits";

    public static getTemplatesForKit(kitId: string): Q.Promise<IKitTemplatesOverrideInfo> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<IKitTemplatesOverrideInfo> {
                return tacoKits.kitHelper.getTemplatesForKit(kitId);
            });
    }

    public static getKitMetadata(): Q.Promise<ITacoKitMetadata> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<ITacoKitMetadata> {
                return tacoKits.kitHelper.getKitMetadata();
            });
    }

    public static getKitInfo(kitId: string): Q.Promise<IKitInfo> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<IKitInfo> {
                return tacoKits.kitHelper.getKitInfo(kitId);
            });
    }

    public static getDefaultKit(): Q.Promise<string> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<string> {
                return tacoKits.kitHelper.getDefaultKit();
            });
    }

    public static getAllTemplates(): Q.Promise<ITemplateOverrideInfo[]> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<ITemplateOverrideInfo[]> {
                return tacoKits.kitHelper.getAllTemplates();
            });
    }

    public static getPlatformOverridesForKit(kitId: string): Q.Promise<IPlatformOverrideMetadata> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<IPlatformOverrideMetadata> {
                return tacoKits.kitHelper.getPlatformOverridesForKit(kitId);
            });
    }

    public static getPluginOverridesForKit(kitId: string): Q.Promise<IPluginOverrideMetadata> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<IPluginOverrideMetadata> {
                return tacoKits.kitHelper.getPluginOverridesForKit(kitId);
            });
    }

    public static getTemplateOverrideInfo(kitId: string, templateId: string): Q.Promise<ITemplateOverrideInfo> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<ITemplateOverrideInfo> {
                return tacoKits.kitHelper.getTemplateOverrideInfo(kitId, templateId);
            });
    }

    public static getValidCordovaCli(kitId: string): Q.Promise<string> {
        return KitHelper.acquireKitPackage()
            .then(function (tacoKits: ITacoKits): Q.Promise<string> {
                return tacoKits.kitHelper.getValidCordovaCli(kitId);
            });
    }

    private static acquireKitPackage(): Q.Promise<ITacoKits> {
        if (!KitHelper.kitPackagePromise) {
            KitHelper.kitPackagePromise = TacoPackageLoader.lazyTacoRequire<ITacoKits>(KitHelper.TACO_KITS_NPM_PACKAGE_NAME,
                KitHelper.dynamicDependenciesLocation, tacoUtility.InstallLogLevel.error);
        }

        return KitHelper.kitPackagePromise;
    }
}

export = KitHelper
