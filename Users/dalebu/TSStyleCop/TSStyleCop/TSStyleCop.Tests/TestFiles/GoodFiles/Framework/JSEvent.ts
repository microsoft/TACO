// ------------------------------------------------------------------------------
// <copyright file="JSEvent.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Common.ts" />
/// <reference path="Debug.ts" />
/// <reference path="ThrottledEventInvoker.ts" />

/**
 * An event object which can have multiple listeners which are called when the event is invoked
 */
class JSEvent {
    /** The list of event listeners which should be invoked when the event is invoked */
    private _handlers: EventHandler[];

    /** The list of throttled event invokers that should be invoked when the event is invoked */
    private _throttledEventInvokers: ThrottledEventInvoker[];

    /**
     * @constructor
     */
    constructor() {
        this._handlers = [];
        this._throttledEventInvokers = [];
    }

    /**
     * Adds a handler to the event.  The handler is removed by calling dispose on the returned object
     * @param handler - The function to be called when the event is invoked
     * @returns A disposable object which removes the handler when it's disposed
     */
    public add(handler: EventHandler): IDisposable {
        Debug.assertIsFunction(handler, "handler");
        this._handlers.push(handler);
        return { dispose: () => this.remove(handler) };
    }

    /**
     * Adds a handler which is called on the next invokation of the event, and then the handler is removed
     * @param handler - The handler to be called on the next invokation of the the event
     * @returns A disposable object which removes the handler when it's disposed
     */
    public addOne(handler: EventHandler): IDisposable {
        var disposable: IDisposable = this.add((args: any) => {
            disposable.dispose();
            handler(args);
        });
        return disposable;
    }

    /**
     * Adds a throttled handler to the event. This handler will not be called more than once per throttleInterval.
     * The handler is removed by calling dispose on the returned object.
     * @param handler - The handler to be called when the event is raised
     * @param throttleInterval - The interval, in milliseconds, during which the event can be raised at most once
     * @returns A disposable object which removes the handler when it's disposed
     */
    public addThrottled(handler: EventHandler, throttleInterval: number): IDisposable {
        Debug.assertIsFunction(handler, "handler");
        Debug.assert(isFinite(throttleInterval) && throttleInterval > 0, "Argument: throttleInterval should be a positive number.");

        this._throttledEventInvokers.push(new ThrottledEventInvoker(handler, throttleInterval));
        return { dispose: () => this._removeThrottledEventHandler(handler) };
    }

    /**
     * Removes a handler from the list of handlers.  This is typically only called by disposing the object returned from an
     * add call, but can be done manually as well.
     * @param handler - The event handler to remove
     */
    public remove(handler: any): void {
        if (typeof handler === "function") {
            var i = this._handlers.length;
            while (i--) {
                if (this._handlers[i] === handler) {
                    this._handlers.splice(i, 1);
                    return;
                }
            }
        } else {
            var i = this._throttledEventInvokers.length;
            while (i--) {
                if (this._throttledEventInvokers[i].handler === handler) {
                    this._throttledEventInvokers.splice(i, 1);
                    return;
                }
            }
        }
    }

    /**
     * Invokes the event with the specified args
     * @param args - The event args to pass to each handler
     */
    public invoke(args?: any): void {
        for (var i = 0; i < this._handlers.length; i++) {
            this._handlers[i](args);
        }

        for (var i = 0; i < this._throttledEventInvokers.length; i++) {
            this._throttledEventInvokers[i].invoke(args);
        }
    }

    /**
     * Checks to see if this event has any handlers (including throttled handlers) associated with it
     * @returns - True iff at least one handler is registered
     */
    public hasHandlersRegistered(): boolean {
        return (this._handlers.length + this._throttledEventInvokers.length > 0);
    }

    /**
     * Removes a throttled handler from the list of handlers.
     * @param handler - The throttled event handler to remove
     */
    private _removeThrottledEventHandler(handler: EventHandler): void {
        var i = this._throttledEventInvokers.length;
        while (i--) {
            if (this._throttledEventInvokers[i].handler === handler) {
                this._throttledEventInvokers.splice(i, 1);
                return;
            }
        }
    }
}
