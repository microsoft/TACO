// ------------------------------------------------------------------------------
// <copyright file="ObservableCollection.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="../JSEvent.ts" />

/**
 * Interface for event args used in the ObservableCollection.changed event
 */
interface IObservableCollectionChangedArgs {
    /** The start index of the items which were added */
    addedIndex?: number;
    
    /** The list of items which were added */
    added?: any[];

    /** The start index of the items which were removed */
    removedIndex?: number;

    /** The list of items which were removed */
    removed?: any[];

    /** True if the collection changed significantly and  the listener should re-examine the entire list */
    reset?: boolean;
}

/**
 * An observable collection which fires events on change.
 */
class ObservableCollection {
    /** The revision of the collection, incremented with each change */
    public revision: number;

    /** The number of items in the collection */
    public length: number;

    /** The event which is fired when the collection changes */
    public changed: JSEvent;

    /**
     * @constructor
     * @param initialItems - The items to add to the collection
     */
    constructor(initialItems?: any[]) {
        this.revision = 0;
        this.changed = new JSEvent();
        initialItems && Array.prototype.push.apply(this, initialItems);
    }

    /**
     * Inserts an item at the specified index
     * @param item - The item to add
     * @param index - The index to insert the item add, if ommitted the item is added to the end of the collection
     */
    public insert(item: any, index?: number): void {
        if (index >= 0 && index < this.length) {
            Array.prototype.splice.call(this, index, 0, item);
        } else {
            index = this.length;
            Array.prototype.push.call(this, item);
        }

        this._invokeChanged(index, [item]);
    }

    /**
     * Removes an item from the collection
     * @param item - The item to remove
     */
    public remove(item: any): void {
        this.removeAt(this.indexOf(item));
    }

    /**
     * Removes an item from the collection at a specific index.
     * @param index - The position in the list to remove.
     */
    public removeAt(index: number): void {
        if (index >= 0 && index < this.length) {
            var item = this[index];

            Array.prototype.splice.call(this, index, 1);
            this._invokeChanged(null, null, index, [item]);
        }
    }

    /**
     * Returns the first index of the specified item
     * @param item - The item to search for
     * @returns The index of the first item in the list that equals item, or -1 if no item is found
     */
    public indexOf(item: any): number {
        var i = this.length;
        while (i--) {
            if (this[i] === item) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Sets the value at the specified index
     * @param index - The index to set
     * @param value - The value to set it to
     */
    public setValue(index: number, value: any): void {
        var prevValue = this[index];
        this[index] = value;
        this.length = Math.max(this.length, index + 1);
        this._invokeChanged(index, [value], index, [prevValue]);
    }

    /**
     * Fires a changed event
     * @param addedIndex - The start index where items were added
     * @param added - The list of items added
     * @param removedIndex - The start index where items were removed
     * @param removed - The list of items removed
     * @param reset - True if the collection reset
     */
    private _invokeChanged(addedIndex: number, added: any[], removedIndex?: number, removed?: any[], reset?: boolean): void {
        this.revision++;
        this.changed.invoke({ addedIndex: addedIndex, added: added, removedIndex: removedIndex, removed: removed, reset: !!reset });
    }
}

ObservableCollection.prototype.length = Array.prototype.length;
