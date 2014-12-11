module Shapes {
    /**
     * Point class which describes a point in 2D cartesian space
     */
    export class Point {
        /** The x value */
        private _x: number;

        /** The y value */
        private _y: number;

        /**
         * The origin point
         */
        public static Origin = new Point(0, 0);

        /**
         * @constructor
         * @param x The x value
         * @param y The y value
         */
        constructor(x: number, y: number) {
            this._x = x;
            this._y = y;
        }

        /**
         * Gets the length of the vector represented by the point
         */
        public get length(): number {
            return Math.sqrt(this._x * this._x + this._y * this._y);
        }

        /**
         * Converts the point to a string in the form (x, y)
         */
        public toString(): string {
            return "(" + this._x + ", " + this._y + ")";
        }
    }
}

// Local variables
var p: Shapes.Point = new Shapes.Point(3, 4);
var length = p.length;