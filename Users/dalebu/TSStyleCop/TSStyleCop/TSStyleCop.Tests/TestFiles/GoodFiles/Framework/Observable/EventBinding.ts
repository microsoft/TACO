// ------------------------------------------------------------------------------
// <copyright file="EventBinding.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Binding.ts" />
/// <reference path="..\JSEvent.ts" />

/**
 * Binds to an event on an object calling handler whenever the event is invoked
 */
class EventBinding implements IDisposable {
    /** The handle to the event currently being listened to */
    private _eventHandle: IDisposable;

    /** The binding to the event object */
    private _binding: IDisposable;

    /**
     * The handler to call when the event is triggered
     */
    private _handler: () => void;

    /**
     * @constructor
     * @param fromObj - The source object that the event is a descendant of
     * @param fromExpression - The binding expression to the event being bound to
     * @param handler - The function to call when the event is invoked
     */
    constructor(fromObj: any, fromExpression: string, handler: () => any) {
        // Validation
        Debug.assertNotNull(fromObj, "fromObj");
        Debug.assertNotNullOrEmpty(fromExpression, "fromExpression");
        Debug.assertIsFunction(handler, "handler");

        this._eventHandle = null;
        this._handler = handler;
        this._binding = new Binding(fromObj, fromExpression, this, "value");
    }

    /**
     * Sets the current event being listened to
     * @param jsEvent - The event being listened to
     */
    public setValue(jsEvent: JSEvent): void {
        Debug.assertInstanceOf(jsEvent, JSEvent, "jsEvent");

        this._eventHandle && this._eventHandle.dispose();
        if (jsEvent) {
            this._eventHandle = jsEvent.add(this._handler);
        }
    }

    /**
     * Disposes the binding removing any handlers
     */
    public dispose(): void {
        this._eventHandle && this._eventHandle.dispose();
        this._binding && this._binding.dispose();
    }
}