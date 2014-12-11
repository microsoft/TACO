// ------------------------------------------------------------------------------
// <copyright file="LruCacheNode.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * A node for LruCache's doubly-linked list of items sorted from most-recently-used to
 * least-recently-used.
 */
class LruCacheNode {
    /** The item's key */
    public key: string;

    /** The item */
    public item: any;

    /**
     * The next node (whose item will have been accessed more less than this 
     * node's)
     */
    public next: LruCacheNode;

    /**
     * The previous node (whose item will have been accessed more recently than this
     * node's)
     */
    public previous: LruCacheNode;
}

