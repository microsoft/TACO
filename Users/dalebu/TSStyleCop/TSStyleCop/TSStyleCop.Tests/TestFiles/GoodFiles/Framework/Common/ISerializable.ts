// ------------------------------------------------------------------------------
// <copyright file="ISerializable.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="..\JSEvent.ts" />

/**
 * Interface for an object that can be serialized and deserialized
 */
interface ISerializable {
    /**
     * Serializes itself and returns an object
     * @returns serialized internal state as an object
     */
    serialize(): any;

    /**
     * Deserializes the given object and updates itself
     * @param obj - object to be deserialized
     */
    deserialize(obj: any): void;

    /**
     * Event fired when the serializable object changed
     */
    serializableObjectChanged: JSEvent;
}
