// ------------------------------------------------------------------------------
// <copyright file="DelayLoadedObject.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * A function that asynchronously creates an object and calls the specified callback
 * method when the object is ready to use.
 */
interface IActivator {
    (callback: IObjectCallback): void;
}

/**
 * A function which can perform work on the delay-loaded object once it's loaded 
 */
interface IObjectCallback {
    (object: any): void;
}

/**
 * An object placeholder that allows objects that are expensive to create to be loaded in
 * the background. Work can be scheduled by calling the doWork method and will be
 * executed once the object is instantiated.
 */
class DelayLoadedObject {
    /** The function that delay-loads this object */
    private _activator: IActivator;

    /** The object (which will be null until it has finished loading) */
    private _object: any;

    /** A list of work callbacks to be executed as soon as the object has finished loading */
    private _workCallbacks: IObjectCallback[];

    /**
     * @constructor
     * @param activator - The function that delay-loads this object
     */
    constructor(activator: IActivator) {
        this._activator = activator;
    }

    /**
     * Schedules work to be executed once the object has finished loading. If the object is
     * already loaded when this is called, the callback will be executed syncronously. If not,
     * this the callback will be queued for execution at a later time.
     * @param callback - A function that performs work on the delay-loaded object once it's ready
     */
    public getObjectAsync(callback: IObjectCallback): void {
        if (this._object) {
            // The object has already been loaded, so do the work synchronously now.
            callback(this._object);
        } else {
            if (!this._workCallbacks) {
                // This is the first doWork call, so queue it up and begin activating the object.
                this._workCallbacks = [callback];
                this._activator((object: any) => this._onObjectLoaded(object));
            } else {
                // The object is already being activating, so add this callback to the queue.
                this._workCallbacks.push(callback);
            }
        }
    }

    /**
     * This function is called by the object activator when it has finished loading the object.
     * @param object - The newly created object
     */
    private _onObjectLoaded(object: any): void {
        // Store the object
        this._object = object;

        // Call any work callbacks that are waiting to be executed        
        for (var i = 0; i < this._workCallbacks.length; i++) {
            this._workCallbacks[i](object);
        }

        // Release objects we no longer need
        this._activator = null;
        this._workCallbacks = null;
    }
}

