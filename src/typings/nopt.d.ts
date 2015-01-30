// Type definitions for nopt

/// <reference path="node.d.ts" />
declare module Nopt {
    export function nopt(types: any, shorthands: any, args: any, slice?: any): any;
    export function clean(data: any, types: any, typeDefs: any[]): any;
}

declare module "nopt" {
    export = Nopt;
}
