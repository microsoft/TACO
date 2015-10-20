/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

declare module TacoUtility {
    class PromisesUtils {
        /* 
        * Given an object that might be either a value or a promise, we'll execute a callback after the object gets "finished"
        *    In the case of a promise, that means on the .finally handler. In the case of a value, that means immediately.
        *    It also supports attaching a fail callback in case it's a promise
        */
        public static executeAfter<T>(valueOrPromise: T, afterCallback: { (): void }, failCallback?: { (reason: any): void }): T;
    }
}
