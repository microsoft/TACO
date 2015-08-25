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
     * This class counts how many bytes pass through it in a pipe stream.
     * Example usage:
     * var cs = new CountStream();
     * readableStream.pipe(cs).pipe(writableStream);
     * [... later]
     * console.log(cs.count + " bytes written");
     */
    class CountStream extends NodeJSStream.Transform {
        public static count(originalStream: NodeJS.ReadableStream, callback: { (length: number): void }): NodeJS.ReadableStream;
        count: number;
        constructor(options?: NodeJSStream.TransformOptions);
        _transform(chunk: any, encoding: string, callback: (err: Error, buf: Buffer) => void): void;
    }
}
