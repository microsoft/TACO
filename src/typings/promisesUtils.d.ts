/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/Q.d.ts" />

declare module TacoUtility {
    type PromiseFuncOrValue<T> = (() => Q.Promise<T>) | T;
    class PromisesUtils {
        /*
        Wraps the execution of a lambda function, by executing an initializer before the function, and a finalizer after the function
        @initializer Code to execute before calling the main function that is codeToExecute
        @codeToExecute Main function that we want to execute, but we want to surround with some "support" tasks
        @finalizer Code that will be executed no matter what, after codeToExecute finishes executing
        @failHandler fail handler that will be executed if the codeToExecute is a promise, and it ge's rejected.

        @result The result of calling codeToExecute. The result won't be affected neither by @finalizer nor @failHandler
        which are executed only for side effects, and are independent of the result of this method
        */
        public static wrapExecution<T>(initializer: () => void,
            codeToExecute: () => T,
            finalizer: () => void,
            failHandler: (reason: any) => void): T;

        /**
         * Sequentially runs a number of promises obtained from an array of values
         *  @value: array of values used to create chain of promises
         *  @func: accumulator function which runs over each array value and returns a promise which resolves to an accumulated value
         *  @initialValue: initial accumulated value
         */
        public static chain<T, U>(values: T[], func: (value: T, valueSoFar: U) => Q.Promise<U>, initialValue?: U): Q.Promise<U>;

        /**
         * Syntactic sugar for if/else style promises
         *  @condition: Promise resolving to true/false 
         *  @promiseTrue: then promise if condition resolves to "true"
         *  @promiseFalse: then promise if condition resolves to "false"
         */
        public static condition<T>(condition: Q.Promise<boolean> | boolean, promiseTrue: (() => Q.Promise<T>) | T, promiseFalse: (() => Q.Promise<T>) | T): Q.Promise<T>;

        /**
         * Syntactic sugar for promise or
         *  @conditions: a variable array of promises which resolve to true/false
         *
         *  @returns: resolves to true if either of the promises resolve to true, false otherwise
         */
        public static or(...conditions: PromiseFuncOrValue<boolean>[]): Q.Promise<boolean>;

        /**
         * Syntactic sugar for promise and
         *  @conditions: a variable array of promises which resolve to true/false
         *
         *  @returns: resolves to true if all the promises resolve to true, false otherwise
         */
        public static and(...conditions: PromiseFuncOrValue<boolean>[]): Q.Promise<boolean>;
   }
}
