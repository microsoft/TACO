// ------------------------------------------------------------------------------
// <copyright file="Binding.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="../Common.ts" />
/// <reference path="Observable.ts" />
/// <reference path="../Debug.ts" />

/**
 * A binding class which keeps the property value in sync between to objects.  It listens to the .changed event or the dom "onchange" event.
 * The binding is released by calling dispose
 */
class Binding implements IDisposable {
    /** The source object (typically fromObj) */
    private _source: any;

    /** The handle to the event handler listening for source changes */
    private _sourceChangedHandler: IDisposable;

    /** The handle to the event handler listening for destination changes if the binding is two way */
    private _destChangedHandler: IDisposable;

    /** The single property to listen for changes on.  This is the first part of fromExpression.  The rest is handled via recursive bindings */
    private _sourceProperty: string;

    /** The last recorded value of _source[_sourceProperty], the binding is updated only if the current value is not equal to _value */
    private _value: any;

    /** The child binding used for binding to the remainder of fromExpression when fromExpression isn't a simple property name */
    private _childBinding: Binding;
    
    /** True if the binding is currently paused and shouldn't react to events.  Used to avoid infinite loops in TwoWay binding */
    private _paused: boolean;
    
    /** True if the binding is two way */
    private _twoWay: boolean;

    /**
     * The converter which converts from source value to destination value
     * @param value - The value to convert
     * @returns The converted value
     */
    private _converter: (value: any) => any;

    /** The object to set properties on */
    private _toObj: any;
    
    /** The property to set on _toObj */
    private _toProperty: string;

    /**
     * @constructor
     * @param fromObj - The object to get the value from
     * @param fromExpression - A property or property chain of the named property to retrieve from fromObj can contain . but not []
     * @param toObj - The object to assign the value to
     * @param toProperty - The property on toObj which will receive the value cannot contain . or []
     * @param converter - The function to convert from the value on fromObj to the value on toObj, default is no conversion
     * @param mode - The binding mode 'OneWay' or 'TwoWay'.  TwoWay binding will copy the value from toObj to fromObj when toObj changes
     */
    constructor(fromObj: any, fromExpression: string, toObj: any, toProperty: string, converter?: (value: any) => any, mode?: string) {
        // Validation
        Debug.assertNotNullOrEmpty(fromExpression, "fromExpression");
        Debug.assertNotNull(toObj, "toObj");
        Debug.assertNotNullOrEmpty(toProperty, "toProperty");

        // Default the mode to OneWay
        mode = mode || "OneWay";
        var expressionParts = fromExpression.split(".");

        this._source = null;
        this._sourceChangedHandler = null;
        this._destChangedHandler = null;
        this._sourceProperty = expressionParts[0];
        this._value = null;
        this._childBinding = null;
        this._paused = false;
        this._twoWay = false;
        this._converter = converter;
        this._toObj = toObj;
        this._toProperty = toProperty;

        // If there is more than one property in the fromExpression, we have to create a child binding
        if (expressionParts.length > 1) {
            expressionParts.splice(0, 1);
            this._childBinding = new Binding(null, expressionParts.join("."), toObj, toProperty, converter, mode);
        } else if (mode === "TwoWay") {
            this._twoWay = true;
            this._destChangedHandler = this._attachChangeHandler(toObj, () => this._updateSourceFromDest());
        }

        this._setSource(fromObj);
    }

    /**
     * Disposes the binding
     */
    public dispose(): void {
        this._sourceChangedHandler && this._sourceChangedHandler.dispose();
        this._sourceChangedHandler = null;
        this._source = null;
        this._childBinding && this._childBinding.dispose();
        this._childBinding = null;
        this._destChangedHandler && this._destChangedHandler.dispose();
        this._destChangedHandler = null;
    }

    /**
     * Sets the source of the binding.  Usually fromObj, but could be something else in the case of a child binding
     * @param source - The source object that the binding is listening to
     */
    private _setSource(source: any): void {
        // Dispose the previous source change handler first
        this._sourceChangedHandler && this._sourceChangedHandler.dispose();
        this._source = source;

        // Listen to change event on the new source
        this._sourceChangedHandler = this._source && this._attachChangeHandler(this._source, () => this._checkForValueChange());
        this._checkForValueChange();

        if (this._twoWay) {
            this._updateSourceFromDest();
        }
    }

    /**
     * Attaches a change handler to obj and returns an object that can be disposed to remove the handler
     * Prefers obj.changed, but will use the dom onchange event if that doesn't exist
     * @param obj - The object to listen for changes on
     * @param handler - The function to be called when a change occurs
     * @returns An object that can be disposed to remove the change handler
     */
    private _attachChangeHandler(obj: any, handler: () => any): IDisposable {
        if (obj.changed) {
            return obj.changed.add(handler);
        } else if (obj.add_event) {
            obj.add_event("change", handler);
            return { dispose: () => obj.remove_event("change", handler) };
        }
     }

    /**
     * Checks to see if the source value has changed, and if so updates the destination object
     */
    private _checkForValueChange(): void {
        var newValue = this._getValue();
        if (!Observable.areEqual(this._value, newValue)) {
            this._value = newValue;
            this._updateDestination();
        }
    }

    /**
     * Gets the current value from the source object
     * @returns The current value from the source object
     */
    private _getValue(): any {
        if (this._source) {
            return Observable.getValue(this._source, this._sourceProperty);
        } else {
            return null;
        }
    }

    /**
     * Updates the source value when the destination value changes
     * TODO: Incorporate a reverse converter
     */
    private _updateSourceFromDest(): void {
        if (this._source) {
            this._paused = true;
            Observable.setValue(this._source, this._sourceProperty, Observable.getValue(this._toObj, this._toProperty));
            this._paused = false;
        }
    }

    /**
     * Updates the destination (toObj or childBinding) with the value from source
     */
    private _updateDestination(): void {
        if (this._paused) {
            return;
        }

        this._paused = true;
        if (this._childBinding) {
            this._childBinding._setSource(this._value);
        } else {
            var value = this._value;
            if (this._converter) {
                value = this._converter(value);
            }
            
            Observable.setValue(this._toObj, this._toProperty, value);
        }

        this._paused = false;
    }
}
