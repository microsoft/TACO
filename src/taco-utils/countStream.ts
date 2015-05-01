/// <reference path="../typings/node.d.ts" />
import stream = require ("stream");
import util = require ("util");

import Transform = stream.Transform;

module TacoUtility {
    /**
     * This class counts how many bytes pass through it in a pipe stream.
     * Example usage:
     * var cs = new CountStream();
     * readableStream.pipe(cs).pipe(writableStream);
     * [... later]
     * console.log(cs.count + " bytes written");
     */
    export class CountStream extends Transform {
        public count: number;
        constructor(options?: stream.TransformOptions) {
            super(options);
            this.count = 0;
        }

        public _transform(chunk: any, encoding: string, callback: (err: Error, buf: Buffer) => void): void {
            this.count += chunk.length;
            callback(null, chunk);
        }
    }
}

export = TacoUtility;