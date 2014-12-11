// ------------------------------------------------------------------------------
// <copyright file="LruCache.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="../Debug.ts" />
/// <reference path="ICache.ts" />
/// <reference path="LruCacheNode.ts" />
/// <reference path="..\Observable\Observable.ts" />

/**
 * An LRU (least recently used) cache where the items that haven't been accessed (via
 * getItem) in the longest time are discarded first. It utilizes a key->node dictionary
 * and a doubly-linked list of nodes sorted from the most-recently-used item to the
 * least-recently-used item. This allows both addItem and getItem to be O(1) operations.
 */
class LruCache implements ICache {
    /** The maximum number of items the cache can hold */
    private _capacity: number;

    /** The number of items currently in the cache */
    private _count: number;

    /**
     * The head of the linked list, representing the least-recently-used item
     */
    private _headNode: LruCacheNode;

    /**
     * The tail of the linked list, representing the most-recently-used item
     */
    private _tailNode: LruCacheNode;

    /**
     * A dictionary mapping keys to nodes
     */
    private _dictionary: { [key: string]: LruCacheNode; };

    /**
     * @constructor
     * @param capacity - The maximum number of items (NOT bytes) the cache can hold
     */
    constructor(capacity: number) {
        Debug.assert(capacity > 0, "The capacity must be a positive integer.");

        this._capacity = capacity;
        this._count = 0;
        this._dictionary = {};
    }

    /**
     * Adds an item to the cache. If the cache is full (where "full" is dependent on the 
     * specific cache implementation), one or more items may be discarded to make room
     * for the new item. If the cache already contains an entry for this key, it will be
     * replaced with the new item.
     * @param key - A lookup key to uniquely identify the item
     * @param item - The item to store
     */
    public addItem(key: string, item: any): void {
        Debug.assertNotNull(key, "key");
        Debug.assertNotNull(item, "item");

        var node = this._dictionary[key];
        if (node) {
            // If an item with this key already exists, just replace the item.
            if (!Observable.areEqual(node.item, item)) {
                this._dictionary[key].item = item;

                // Move the node to the head of the doubly-linked list since it's now the
                // most-recently used.
                this._moveNodeToHead(node);
            }
        } else {
            // If an item with this key doesn't already exist, add it now.
            this._addNewItem(key, item);
        }
    }

    /**
     * Retrieves an item from the cache
     * @param key - The lookup key that uniquely identifies the item
     * @returns The item requested ("cache hit") or null if the item is not present ("cache 
     * miss")
     */
    public getItem(key: any): any {
        Debug.assertNotNull(key, "key");

        var item: any;
        var node = this._dictionary[key];
        if (node) {
            // Cache hit
            item = node.item;

            // Move the node to the head of the doubly-linked list since it's now the
            // most-recently used.
            this._moveNodeToHead(node);
        } else {
            // Cache miss
            item = null;
        }

        return item;
    }

    /**
     * Removes all items from the cache
     */
    public clear(): void {
        this._headNode = null;
        this._tailNode = null;
        this._dictionary = {};
        this._count = 0;
    }

    /**
     * Adds a new item to the cache. If the cache is full (where "full" is dependent on the 
     * specific cache implementation), one or more items may be discarded to make room
     * for the new item.
     * @param key - A lookup key to uniquely identifies the item
     * @param item - The item to store
     */
    private _addNewItem(key: any, item: any): void {
        Debug.assertNotNull(key, "key");
        Debug.assertNotNull(item, "item");
        Debug.assert(!this._dictionary[key], "An item using the specified key already exists in this cache.");

        Debug.assert(this._count <= this._capacity, "The count should never exceed the capacity.");

        if (this._count === this._capacity) {
            // We're at capacity, so remove the least-recently-used item to make room for
            // this item. (Note that the _removeNode method only removes the node from
            // the linked list and we need to also remove it from the dictionary here. That
            // way, _removeNode can be called from _moveNodeToHead as well.)
            var lruNode = this._tailNode;
            this._removeNode(lruNode);
            this._dictionary[lruNode.key] = null;
            this._count--;

            // Dispose the discarded item now, if it's IDisposable, since normally the cache will be the only reference holder.
            lruNode.item.dispose && lruNode.item.dispose();
        }

        // Create a new node for this item
        var newNode = new LruCacheNode();
        newNode.key = key;
        newNode.item = item;

        // And place it at the head of the queue. (It's now the most-recently-used item.)
        if (this._count === 0) {
            this._headNode = this._tailNode = newNode;
        } else {
            newNode.next = this._headNode;
            this._headNode.previous = newNode;
            this._headNode = newNode;
        }

        // Store the node in the dictionary for fast lookup by key and increment the count.
        this._dictionary[key] = newNode;
        this._count++;
    }

    /**
     * Removes a node from the doubly-linked list.
     * @param node - The node to remove
     */
    private _removeNode(node: LruCacheNode): void {
        Debug.assertNotNull(node, "node");

        // Special-case the case where there's only one node to simplify the general case.
        if (this._count === 1) {
            Debug.assert(node === this._headNode, "The only node must be the head node.");
            Debug.assert(node === this._tailNode, "The only node must be the tail node.");
            this._headNode = null;
            this._tailNode = null;
            return;
        }

        var previousNode = node.previous;
        var nextNode = node.next;

        if (previousNode) {
            // General case
            previousNode.next = nextNode;
        } else {
            // Removing the head node, so the "next node" becomes the new head node
            Debug.assert(node === this._headNode, "Only the head node can have null previous.");
            this._headNode = nextNode;
        }

        if (nextNode) {
            // General case
            nextNode.previous = previousNode;
        } else {
            // Removing the tail node, so the "previous node" becomes the next tail node
            Debug.assert(node === this._tailNode, "Only the tail node can have null next.");
            this._tailNode = previousNode;
        }
    }

    /**
     * Moves an existing node to the head (most recently used) of the list.
     * @param node - The node to move
     */
    private _moveNodeToHead(node: LruCacheNode): void {
        Debug.assertNotNull(node, "node");

        // Short-circuit the edge case where the node is already at the head of the list.
        if (node === this._headNode) {
            return;
        }

        // Remove the node from its existing slot
        this._removeNode(node);

        // And place it in the head slot
        if (this._headNode) {
            this._headNode.previous = node;
        }

        node.previous = null;
        node.next = this._headNode;
        this._headNode = node;
    }
}

