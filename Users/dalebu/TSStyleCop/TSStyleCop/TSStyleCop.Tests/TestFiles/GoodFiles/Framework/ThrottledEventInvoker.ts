// ------------------------------------------------------------------------------
// <copyright file="ThrottledEventInvoker.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Common.ts" />
/// <reference path="Debug.ts" />

/**
 * Wraps an event handler ensuring that events aren't raised more than once within a specified interval.
 */
class ThrottledEventInvoker {
    /** The minimum amount of time, in milliseconds, to wait before raising this event again */
    private _interval: number;

    /** The time when the event was last raised. */
    private _lastRaisedTime: number;
    
    /** A flag to indicate that an event has been scheduled to be raised later. */
    private _isScheduled: boolean;

    /** The events args to be used when raising the next scheduled event. */
    private _nextScheduledEventArgs: any;

    /** The event handler to call when this event is raised */
    public handler: EventHandler;

    /**
     * @constructor
     * @param handler - The event handler that will be called when this event is raised
     * @param interval - The minimum amount of time, in milliseconds, to wait before raising this event again
     */
    constructor(handler: EventHandler, interval: number) {
        Debug.assertIsFunction(handler, "handler");
        Debug.assert(isFinite(interval) && interval > 0, "Argument: interval should be a positive number.");

        this.handler = handler;
        this._interval = interval;
    }

    /**
     * Raises the event with the specified args or schedules it for later
     * @param args - The event args to pass to each handler
     */
    public invoke(args?: any): void {
        if (this._isScheduled) {
            // An event has already been scheduled to be raised in the future, so simply update the event args that
            // will be used.
            this._nextScheduledEventArgs = args;
        } else {
            var now = new Date().getTime();
            if (this._lastRaisedTime && (this._lastRaisedTime < now + this._interval)) {
                // This event is being invoked within the throttle interval, so schedule it for later.
                this._isScheduled = true;
                this._nextScheduledEventArgs = args;
                setTimeout(() => { this._raiseScheduledEvent(); }, this._lastRaisedTime + this._interval - now);
            } else {
                // This event is being invoked outside the throttle interval, so raise it now.
                this.handler(args);
                this._lastRaisedTime = now;
            }
        }
    }

    /**
     * Raises a scheduled event and clears the scheduled flag
     */
    private _raiseScheduledEvent(): void {
        this.handler(this._nextScheduledEventArgs);

        this._lastRaisedTime = new Date().getTime();
        this._isScheduled = false;
    }
}
