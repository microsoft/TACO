// ------------------------------------------------------------------------------
// <copyright file="ICache.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * An interface for the general cache data structure that allows items to be stored and
 * retrieved by key. Specific cache implementations are responsible for discarding items
 * at specific times to maintain a balance between fast lookups and minimal resource
 * utilization. 
 */
interface ICache {
    /**
     * Adds an item to the cache. If the cache is full (where "full" is dependent on the 
     * specific cache implementation), one or more items may be discarded to make room
     * for the new item. If the cache already contains an entry for this key, it will be
     * replaced with the new item.
     * @param key - A lookup key to uniquely identify the item
     * @param item - The item to store
     */
    addItem(key: string, item: any): void;

    /**
     * Retrieves an item from the cache
     * @param key - The lookup key that uniquely identifies the item
     * @returns The item requested ("cache hit") or null if the item is not present ("cache 
     * miss")
     */
    getItem(key: string): any;

    /**
     * Removes all items from the cache
     */
    clear(): void;
}

