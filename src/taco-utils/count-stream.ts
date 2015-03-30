/// <reference path="../typings/node.d.ts" />
import stream = require("stream");
import Transform = stream.Transform;
import util = require("util");

module TacoUtility {
    export class CountStream extends Transform {
        public count: number;
        constructor(options?: stream.TransformOptions) {
            super(options);
            this.count = 0;
        }

        public _transform(chunk: any, encoding: string, callback: (err: Error, buf: Buffer) => void) {
            this.count += chunk.length;
            callback(null, chunk);
        }
    }
}
export = TacoUtility;