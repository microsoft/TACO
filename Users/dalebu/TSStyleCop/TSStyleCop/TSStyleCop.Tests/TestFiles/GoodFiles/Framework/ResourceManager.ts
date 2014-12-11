// ------------------------------------------------------------------------------
// <copyright file="ResourceManager.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Debug.ts" />

/**
 * Map control resources manager
 */
class ResourceManager {
    /**
     * Adds resource strings.
     * @param pluginName - The plugin name as key
     * @param resources - An object mapping resource Ids to localized string values
     */
    public static init(pluginName: string, resources: { [key: string]: string; }): void {
        if (!ResourceManager[pluginName]) {
            ResourceManager[pluginName] = new ResourceManager();
        }

        var pluginResources = ResourceManager[pluginName];
        
        var key: string;
        for (key in resources) {
            if (resources.hasOwnProperty(key)) {
                pluginResources[key] = resources[key];
            }
        }
    }

    /**
     * Looks up a localized string by resource Id
     * @param resourceId - The resource Id
     * @returns The localized string
     */
    public get(resourceId: string): string {
        var resourceString = this[resourceId];
        Debug.assertNotNullOrEmpty(resourceString, resourceId);

        return resourceString;
    }
}