// ------------------------------------------------------------------------------
// <copyright file="ICancelEventArgs.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * Interface for an event that can be cancelled by the handler
 */
interface ICancelEventArgs {
    /** True if the event should be cancelled */
    cancel: boolean;
}
