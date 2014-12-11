// ------------------------------------------------------------------------------
// <copyright file="Dispatcher.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Gimme.d.ts" />
/// <reference path="Common.ts" />
/// <reference path="Common\Action.ts" />
/// <reference path="Debug.ts" />

/**
 * A static class used for querying functions to be executed "next frame", but functions could be delayed
 * longer to prevent starving the UI thread
 */
class Dispatcher {
    /**
     * The maximum time that the dispatcher can continue to call new functions before it yields the UI thread
     * @const
     */
    private static MAX_DISPATCH_TIME = 100;

    /**
     * The expando property name placed on functions to hold their dispatch order
     * @const
     */
    private static OrderAttributeKey = "$mm$dispatchOrder";

    /** The function to call to request an animation frame */
    private static RequestAnimFrame = Gimme.Effects.Animation.requestAnimationFrame;

    /** The timeout id for the tick function */
    private static TickTimeoutId: number;

    /** The list of actions to be dispatched on the next frame */
    private static DispatchedQuery: Action[] = new Array();

    /** The list of actions currently executing */
    private static RunningQuery: Action[] = new Array();

    /**
     * Dispatch given function to be executed next animation frame
     * @param f - The function to delay execute
     * @param dispatchOrder - The optional priority. Higher number means higher priority
     */
    public static dispatch(f: Action, dispatchOrder?: number): void {
        Debug.assertIsFunction(f, "f");

        // Make sure function has a dispatch order
        f[_orderAttributeKey] = dispatchOrder || 0;

        // Don't dispatch same function twice
        var i = _dispatchedQuery.length;
        while (i--) {
            if (_dispatchedQuery[i] === f) {
                return;
            }
        }

        // Add to end of dispatch query
        _dispatchedQuery.push(f);

        // Ensure that we will run the dispatch query after the timeout
        _ensureTimer();
    }

    /**
     * Cancels the dipatch for given function
     * @param f - The function to remove from the dispatch queue
     */
    public static cancelDispatch(f: Action): void {
        // Remove from both the dispatched query, and the currently executing query, if there is one
        var i = _dispatchedQuery.length;

        while (i--) {
            if (_dispatchedQuery[i] === f) {
                _dispatchedQuery.splice(i, 1);
            }
        }

        i = _runningQuery.length;
        while (i--) {
            if (_runningQuery[i] === f) {
                _runningQuery.splice(i, 1);
            }
        }
    }

    /**
     * The actual function executed "FPS" times per second
     * this is where we run the functions queried in _dispatchedQuery
     */
    private static _tick(): void {
        var startTime = new Date().getTime();
        
        // Reset the flag after running the query, so the next frames timer won't start until we done
        _tickTimeoutId = null;

        // If something was dispatched, make sure to run the _tick next frame
        if (_dispatchedQuery.length) {
            _ensureTimer();
        }

        // Run the dispatched functions
        // Swap the "current" and "dispatched", so the executing code can re-dispatch into "dispatched" query
        var temp = _dispatchedQuery;
        _dispatchedQuery = _runningQuery;
        _runningQuery = temp;

        _runningQuery.sort(_sortByOrder);
        var timedOut = false;
        while (_runningQuery.length) {
            if (timedOut) {
                _dispatchedQuery.push(_runningQuery.shift());
            } else {
                _runningQuery.shift()();
                if (new Date().getTime() - startTime > MAX_DISPATCH_TIME) {
                    timedOut = true;
                }
            }
        }
    }

    /**
     * Sorts the functions being dispatched by their priority
     * @param a - The first function to compare
     * @param b - The second function to compare
     * @returns A positive value if a is higher priority, a negative value if it is lower, and 0 if a and b are equal
     */
    private static _sortByOrder(a: Action, b: Action): number {
        return a[_orderAttributeKey] - b[_orderAttributeKey];
    }

    /**
     * Make sure that we have a timer started to run the _tick next "frame"
     * This is where the appropriate delay is caclulated so we run _tick as close to "maxFPS times a second" as possible
     */
    private static _ensureTimer(): void {
        if (!_tickTimeoutId) {
            _tickTimeoutId = _requestAnimFrame(_tick);
        }
    }
}
