// ------------------------------------------------------------------------------
// <copyright file="ObservableObjectChangedArgs.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="ObservableObject.ts" />

/**
 * Event args included in ObservableObject.changed event
 */
class ObservableObjectChangedArgs {
    /** The sender of the event */
    public sender: any;

    /** The property name that changed */
    public name: string;

    /** The value of the property before the change */
    public oldValue: any;

    /** The new value of the property */
    public newValue: any;

    /**
     * @constructor
     * @param sender - the object that fired the event
     * @param name - The property name that changed
     * @param oldValue - The value of the property before the change
     * @param newValue - The new value of the proerty
     */
    constructor(sender: any, name: string, oldValue: any, newValue: any) {
        this.sender = sender;
        this.name = name;
        this.oldValue = oldValue;
        this.newValue = newValue;
    }
}