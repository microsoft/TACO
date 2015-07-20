/**
  *******************************************************
  *                                                     *
  *   Copyright (C) Microsoft. All rights reserved.     *
  *                                                     *
  *******************************************************
  */
/// <reference path="../../../typings/node.d.ts" />
/// <reference path="../../../typings/tacoRemoteLib.d.ts" />
/// <reference path="../../../typings/express.d.ts" />
/// <reference path="../../../typings/tacoKits.d.ts" />
"use strict";
var path = require("path");
var dynamicDependenciesLocation = path.join(__dirname, "../dynamicDependencies.json");
var tacoKits = "taco-kits";
var KitHelper = (function () {
    function KitHelper() {
    }
    KitHelper.getKitMetadata = function () {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getKitMetadata();
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getKitInfo = function (kitId) {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getKitInfo();
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getDefaultKit = function () {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getDefaultKit();
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getValidCordovaCli = function (kitId) {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getValidCordovaCli(kitId);
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getPlatformOverridesForKit = function (kitId) {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getPlatformOverridesForKit(KitId);
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getPluginOverridesForKit = function (kitId) {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getPluginOverridesForKit(kitId);
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getTemplateOverrideInfo = function (kitId, templateId) {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getTemplateOverrideInfo(kitId, templateId);
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getTemplatesForKit = function (kitId) {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getTemplatesForKit(kitId);
        })
            .catch(function (err) {
            throw err;
        });
    };
    KitHelper.getAllTemplates = function () {
        return TacoPackageLoader.lazyTacoRequire(tacoKits, dynamicDependenciesLocation)
            .then(function (tacoKits) {
            return tacoKits.kitHelper.getAllTemplates();
        })
            .catch(function (err) {
            throw err;
        });
    };
    return KitHelper;
})();
