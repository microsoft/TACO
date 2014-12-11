// ------------------------------------------------------------------------------
// <copyright file="Anchor.ts" company="Microsoft Corporation">
//     Copyright (c) Microsoft Corporation. All Rights Reserved.
//     Information Contained Herein is Proprietary and Confidential.
// </copyright>
// ------------------------------------------------------------------------------
/// <reference path="Point.ts" />
/// <reference path="Units.ts" />

/**
 * Represents the anchor in pixel or percent
 */
class Anchor extends Point {
    /** The units enum */
    public units: Units;

    /**
     * @constructor
     * @param point - The point in any cordinate
     * @param units - Units in pixel or percent
     */
    constructor(x: number, y: number, units?: Units) {
        super(x, y);
        this.units = units || Units.pixel;
    }
}