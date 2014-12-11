// ------------------------------------------------------------------------------
// <copyright file="Point.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/**
 * Represents a point in any coordinate system
 */
class Point {
    /** The x coordinate */
    public x: number;

    /** The y coordinate */
    public y: number;

    /** The z coordinate */
    public z: number;

    /**
     * @constructor
     * @param x - The x coordinate
     * @param y - The y coordinate
     * @param z - The z coordinate
     */
    constructor(x: number, y: number, z?: number) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
}
