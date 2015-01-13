// Type definitions for nopt

/// <reference path="../node/node.d.ts" />
declare module 'nopt' {
    export function nopt(types: any, shorthands: any, args: any, slice?: any): any;
    export function clean(data: any, types: any, typeDefs: any[]): any;
}
