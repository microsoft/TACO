/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    /**
     * This class converts all newlines it encounters to either windows or unix style newlines, depending on the OS
     * Example usage:
     * var nns = new NewlineNormalizerStream();
     * readableStream.pipe(nns).pipe(writableStream);
     */
    class NewlineNormalizerStream extends NodeJSStream.Transform {
        constructor(options?: NodeJSStream.TransformOptions);
        _transform(chunk: any, encoding: string, callback: (err: Error, buf: string) => void): void;
    }
}
