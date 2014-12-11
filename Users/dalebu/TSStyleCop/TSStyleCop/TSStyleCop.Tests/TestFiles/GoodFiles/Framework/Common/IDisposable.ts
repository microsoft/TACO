// ------------------------------------------------------------------------------
// <copyright file="IDisposable.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * Interface for an object that should be disposed when it's done being used
 */
interface IDisposable {
    /**
     * Disposes the object freeing any resources it has or events it's tied to
     */
    dispose(): void;
}
