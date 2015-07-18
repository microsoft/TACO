declare module "nconf" {
    export function save(value?: any, callback?: Function): any;
    export function merge(value: {}): any;
    export function merge(value: any, key: string): any;
    export function merge(callback: Function, value: {}): any;
    export function merge(callback: Function, value: any, key: string): any;
}