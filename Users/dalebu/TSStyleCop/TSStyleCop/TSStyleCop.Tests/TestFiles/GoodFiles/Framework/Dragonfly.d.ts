// ------------------------------------------------------------------------------
// <copyright file="Dragonfly.d.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * Signature for the factory references passed to IDragonflyContainer.instanceAsyncAll
 */
interface IDragonflyFactoryReference {
    /**
     * Factory name of the object to create.
     */
    name: string;

    /**
     * Collection of named arguments to pass to the created object instance.
     */
    args?: { [key: string]: any; };
}

/**
 * Interface to the Dragonfly container object which is our javascript dependency injection
 * container
 */
interface IDragonflyContainer {
    /**
     * Registers an instance of a class as a named object
     * @param name - The name to refer to the object by
     * @param value - The object instance which will be used to fullfill objects of the given name
     */
    registerInstance(name: string, value: any): void;

    /**
     * Creates an object by downloading all scripts necessary to meet its dependencies, creating all dependencies,
     * then creating the object with the dependencies passed as parameters
     * @param name - The factory name of the object to be created
     * @param callback - Function invoked when the object instance has been created. The callback function receives the
     * object instance as its parameter.
     * @param namedArgs - Optional dictionary of named arguments used to initialize the object instance.
     */
    instanceAsync(name: string, callback: (value: any) => void, namedArgs?: { [key: string]: any; }): void;

    /**
     * Creates a group of objects by downloading all scripts necessary to meet their dependencies, creating all 
     * dependencies, then passing those dependencies as parameters. This is the batch version of instanceAsync.
     * @param factories - Factory reference data for the objects to be created.
     * @param callback - Function invoked when all object instances have been created. The callback function receives
     * a dictionary of object instances, keyed by their fully qualified names.
     */
    instanceAsyncAll(factories: IDragonflyFactoryReference[], callback: (responses: { [key: string]: any; }) => void): void;
}
