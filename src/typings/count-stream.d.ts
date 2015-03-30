/// <reference path="../typings/node.d.ts" />
declare module TacoUtility {
    class CountStream extends NodeJSStream.Transform {
        count: number;
        constructor(options?: NodeJSStream.TransformOptions);
        _transform(chunk: any, encoding: string, callback: (err: Error, buf: Buffer) => void): void;
    }
}