// ------------------------------------------------------------------------------
// <copyright file="Size.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * Size with numeric width/height
 */
class Size {
    /** The width */
    public width: number;

    /** The height */
    public height: number;

    /**
     * @constructor
     * @param width - The width
     * @param height - The height
     */
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
    }
}