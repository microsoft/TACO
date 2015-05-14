/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */
// Barebones typings for jsdoc-parse

declare module JSDocParse {
    export interface IArgs {
        src: string
    }

    export function parse(arg: IArgs): NodeJSStream.Readable;
}

declare module "jsdoc-parse" {
    import parse = JSDocParse.parse;
    export = parse;
}