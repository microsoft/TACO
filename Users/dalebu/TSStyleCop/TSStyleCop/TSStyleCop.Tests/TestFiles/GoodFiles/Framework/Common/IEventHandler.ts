// ------------------------------------------------------------------------------
// <copyright file="EventHandler.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * Interface for a function which handles an event
 */
interface IEventHandler {
    /**
     * Handles the event
     * @param args - The event args
     */
    (args: any): void;
}
