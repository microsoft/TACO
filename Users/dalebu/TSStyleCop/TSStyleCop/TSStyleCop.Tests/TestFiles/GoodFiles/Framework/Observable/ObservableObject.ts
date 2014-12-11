// ------------------------------------------------------------------------------
// <copyright file="ObservableObject.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Observable.ts" />
/// <reference path="..\JSEvent.ts" />
/// <reference path="ObservableCollection.ts" />
/// <reference path="ObservableObjectChangedArgs.ts" />

/**
 * Interface for the options which can be defined when declaring an observable property
 */
interface IObservablePropertyOptions {
    /** True if the property's setter should be private.  The getter is always public */
    isPrivate?: boolean;

    /** The initial value for the property */
    defaultValue?: any;
}

/**
 * Interface for the privates object which is populated by ObservableObject constructor holds the private setters
 */
interface IObservablePrivates {
    /**
     * Defines a property with a getter and setter function which fires change events when the setter is called
     * @param name - The name of the property to create camelCased
     * @param onChanged - Callback to be called when the value changes
     * @param typeConverter - Converts values passed into the setter into their destination value
     * @param options - Additional options about the property
     */
    defineProperty? (name: string, onChanged?: (oldValue: any, newValue: any) => any, typeConverter?: (newValue: any, fallbackValue: any) => any, options?: IObservablePropertyOptions): void;
}

/**
 * Object which allows for notifications of property changes to the object
 */
class ObservableObject {
    /**
     * Event fired when a property changes value
     * The args object on the event is an ObservableObjectChangedArgs
     */
    public changed: JSEvent;

    /**
     * The revision of the object which is incremented on each change
     */
    public revision: number;

    /**
     * @constructor
     * @param privates - Optional object where defineProperty and private setters should be placed
     */
    constructor(privates?: IObservablePrivates) {
        var _this = this;
        this.revision = 0;

        // If no privates object is specified, make the private functions public
        privates = privates || this;
    
        // Internal collection of properties
        var properties = {};

        // Change event fired when a property changes
        this.changed = new JSEvent();

        // Mapping of change handler functions by property name
        var propertyChangeHandlers = {};

        /**
         * Sets a property by name firing the change event if the property is different from the previous value
         * @param name - The name of the property to set
         * @param value - The value to set the property to
         */
        function set(name: string, value: any): void {
            var oldValue = properties[name];
            properties[name] = value;

            if (!Observable.areEqual(oldValue, value)) {
                _this.revision++;
                // Call the change handler and changed event
                propertyChangeHandlers[name] && propertyChangeHandlers[name].call(_this, oldValue, value);
                _this.changed.invoke(new ObservableObjectChangedArgs(_this, name, oldValue, value));
            }
        }

        /**
         * Defines a getter and setter functions for a property
         * @param name - The property name.  For a property named "foo", methods named "getFoo" and "setFoo" would be created
         * @param onChanged - Change handler function which receives two arguments: oldValue and newValue
         * @param typeConverter - Converter function which converts values from the setter to the stored value.  For example, one could
         * call setFoo("100,50"), and the converter could convert the value to {width:100,height:50} for a more
         * structured storage
         * @param options - additional options
         */
        function defineProperty(name: string, onChanged?: (oldValue: any, newValue: any) => void, typeConverter?: (newValue: any, fallbackValue: any) => any, options?: IObservablePropertyOptions): void {
            Debug.assertNotNullOrEmpty(name, "name");
            onChanged && Debug.assertIsFunction(onChanged, "onChanged");
            typeConverter && Debug.assertIsFunction(typeConverter, "typeConverter");

            var defaultValue = options && options.defaultValue;
            var setterObj = options && options.isPrivate ? privates : _this;
            if (typeof defaultValue !== "undefined") {
                setter(defaultValue);
            }

            var capitalizedName = Observable.capitalizeProp(name);
            onChanged && (propertyChangeHandlers[name] = onChanged);
            _this["get" + capitalizedName] = getter;
            setterObj["set" + capitalizedName] = setter;

            /**
             * Gets the property value
             * @returns The property value
             */
            function getter(): any {
                return properties[name];
            }

            /**
             * Sets the property value
             * @param value - The value to set the parameter to
             */
            function setter(value: any): void {
                typeConverter && (value = typeConverter(value, properties[name]));
                set(name, value);
            }
        }

        privates.defineProperty = defineProperty;
    }

    /**
     * Creates an observable object with getter and setter functions from an existing object.
     * Useful for turning raw JSON into an observable object.  This function recursively converts the object.
     *
     * TODO consider accepting a name mapping so that JSON with short or obfuscated names can be converted to more
     * readable values
     * @param object - The object to convert into an observable object
     * @returns - An observable object with the same properties as the original JSON except they are getters and setters
     * instead of expandos
     */
    public static fromObject(object: any): any {
        if (object instanceof Array) {
            // Convert arrays into observable objects
            var observableCollection = new ObservableCollection();
            for (var i = 0; i < object.length; i++) {
                observableCollection.insert(ObservableObject.fromObject(object[i]));
            }

            return observableCollection;
        } else if (object && typeof object === "object" && !(object instanceof ObservableObject)) {
            var key: string;
            // Copy over and convert the properties
            var observableObject = new ObservableObject();
            for (key in object) {
                if (object.hasOwnProperty(key)) {
                    (<IObservablePrivates>observableObject).defineProperty(key);
                    Observable.setValue(observableObject, key, ObservableObject.fromObject(object[key]));
                }
            }

            return observableObject;
        } else {
            // For numbers and functions, just the value through
            return object;
        }
    }
}