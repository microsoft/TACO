/// <reference path="node.d.ts"/>

declare module "merge2" {

    interface IMergedStream extends NodeJS.ReadWriteStream {
        add: (source: NodeJS.ReadableStream) => IMergedStream;
    }

    function merge(streams: NodeJS.ReadWriteStream[]): IMergedStream;
    export = merge;
}