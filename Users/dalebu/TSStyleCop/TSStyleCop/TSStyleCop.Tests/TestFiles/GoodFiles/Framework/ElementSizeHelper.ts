// ------------------------------------------------------------------------------
// <copyright file="ElementSizeHelper.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Common\Action.ts" />
/// <reference path="Gimme.d.ts" />
/// <reference path="JSEvent.ts" />

/**
 * Helper for measuring element and being notified when it was resized, independent of the browser
 */
class ElementSizeHelper {
    /** Interval id from window.setInterval used for polling the size */
    private _intervalId: number;

    /** The size from the last resize event */
    private _lastSize: Size;

    /** The element whose size is being monitored */
    private _element: GimmeObject;

    /** The window element as a gimme object */
    private _window: GimmeObject;

    /** Handler which handles resize events and size polling timeouts */
    private _pollSizeHandler: Action;

    /** Resize event fired when the size changes */
    public resize: JSEvent;

    /**
     * @constructor
     * @param element - The element whose size should be monitored
     */
    constructor(element: GimmeObject) {
        this._element = element;
        this._window = Gimme(window);
        this.resize = new JSEvent();
        this.startMonitoring();
    }

    /**
     * Gets the current size of the element being monitored
     * @returns The current size of the element being monitored
     */
    public getSize(): Size {
        var element = this._element[0];
        return new Size(element.offsetWidth, element.offsetHeight);
    }

    /**
     * Starts monitoring for size changes
     */
    public startMonitoring(): void {
        if (!this._pollSizeHandler) {
            this._pollSizeHandler = () => this.pollSize();

            // Does the browser support element resize event or should we poll for element size?
            if (typeof this._element[0].onresize !== "undefined") {
                // If the browser has element resize event, just use it
                this._element.add_event("resize", this._pollSizeHandler);
            } else {
                // Otherwise poll the size every second or when window size changes
                if (!this._intervalId) {
                    this._intervalId = window.setInterval(this._pollSizeHandler, 1000);
                }

                this._window.add_event("resize", this._pollSizeHandler);
            }
        }
    }

    /**
     * Stops monitoring for size changes
     */
    public stopMonitoring(): void {
        if (this._pollSizeHandler) {
            this._element.remove_event("resize", this._pollSizeHandler);
            this._window.remove_event("resize", this._pollSizeHandler);
            this._pollSizeHandler = null;
        }

        if (this._intervalId) {
            window.clearInterval(this._intervalId);
            this._intervalId = null;
        }    
    }

    /**
     * Disposes the object and all related event handlers
     */
    public dispose(): void {
        this.stopMonitoring();
    }

    /**
     * Function called by the timer, or by a resize event to the object or the window.
     * Fires the resize event if the size changed
     */
    public pollSize(): void {
        var currentSize = this.getSize();

        if (!this._lastSize || currentSize.width !== this._lastSize.width || currentSize.height !== this._lastSize.height) {
            this._lastSize = currentSize;
            this.resize.invoke(currentSize);
        }
    }
}
