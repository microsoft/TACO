/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    class JsonSerializer {
        /**
         * Constructs a JsonSerializer  
         * @param {number} Optional, number of spaces (indentation) for every nested level
         * @param {number} Optional, max number of columns allowed in a row
         * @param {number} Optional, initial indentation offset
         */
        constructor(indent?: number, maxRight?: number, indentOffset?: number);

        /**
         * Given a json object returns an indented string
         * @param {object} object to stringify
         */
        public serialize(obj: any): string;
    }
}
