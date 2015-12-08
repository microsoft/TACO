/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../typings/lodash.d.ts" />

"use strict";

import Q = require("q");
import _ = require("lodash");
import argsHelper = require ("./argsHelper");
import ArgsHelper = argsHelper.ArgsHelper;

type PromiseFuncOrValue<T> = (() => Q.Promise<T>) | T;

module TacoUtility {
    export class PromisesUtils {
        /*
        Wraps the execution of a lambda function, by executing an initializer before the function, and a finalizer after the function
        @initializer Code to execute before calling the main function that is codeToExecute
        @codeToExecute Main function that we want to execute, but we want to surround with some "support" tasks
        @finalizer Code that will be executed no matter what, after codeToExecute finishes executing
        @failHandler fail handler that will be executed if the codeToExecute is a promise, and it ge's rejected.

        @result The result of calling codeToExecute. The result won't be affected neither by @finalizer nor @failHandler
        which are executed only for side effects, and are independent of the result of this method
        */
        public static wrapExecution<T>(initializer: () => void, codeToExecute: () => T,
            finalizer: () => void, failHandler: (reason: any) => void = () => { /* Do Nothing */ }): T {
            initializer();
            var result = codeToExecute();
            Q(result).finally(finalizer).fail(failHandler);
            return result;
        }

        /**
         * Sequentially runs a number of promises obtained from an array of values
         *  @value: array of values used to create chain of promises
         *  @func: accumulator function which runs over each array value and returns a promise which resolves to an accumulated value
         *  @initialValue: initial accumulated value
         */
        public static chain<T, U>(values: T[], func: (value: T, valueSoFar: U) => Q.Promise<U>, initialValue?: U): Q.Promise<U> {
            return values.reduce(function(soFar: Q.Promise<U>, val: T): Q.Promise<U> {
                return soFar.then(function(valueSoFar: U): Q.Promise<U> {
                    return func(val, valueSoFar);
                });
            }, Q(initialValue));
        }

        /**
         * Syntactic sugar for promise or
         *  @conditions: a variable array of promises which resolve to true/false
         *
         *  @returns: resolves to true if either of the promises resolve to true, false otherwise
         */
        public static or(...conditions: PromiseFuncOrValue<boolean>[]): Q.Promise<boolean> {
            return PromisesUtils.logicalOp(true, ...conditions);
        }

        /**
         * Syntactic sugar for promise and
         *  @conditions: a variable array of promises which resolve to true/false
         *
         *  @returns: resolves to true if both the promises resolve to true, false otherwise
         */
        public static and(...conditions: PromiseFuncOrValue<boolean>[]): Q.Promise<boolean> {
            return PromisesUtils.logicalOp(false, ...conditions);
        }

        /**
         * Syntactic sugar for if/else style promises
         *  @condition: Promise resolving to true/false 
         *  @promiseTrue: then promise if condition resolves to "true"
         *  @promiseFalse: then promise if condition resolves to "false"
         */
        public static condition<T>(condition: Q.Promise<boolean> | boolean,
            promiseTrue: (() => Q.Promise<T>) | T,
            promiseFalse: (() => Q.Promise<T>) | T): Q.Promise<T> {

            var _promiseTrue: () => Q.Promise<T>  = PromisesUtils.getPromiseFunc(promiseTrue);
            var _promiseFalse: () => Q.Promise<T> = PromisesUtils.getPromiseFunc(promiseFalse);

            if (typeof condition === "boolean") {
                return condition ? _promiseTrue() : _promiseFalse();
            }
            return (<Q.Promise<boolean>>condition)
                .then(function(result: boolean): Q.Promise<T> {
                    return result ? _promiseTrue() : _promiseFalse();
                });
        }

        /**
         * Syntactic sugar for promise or
         *  @condition1: Promise1 resolving to true/false 
         *  @condition2: Promise2 resolving to true/false 
         *
         *  @returns: resolves to true if either of the promises resolve to true, false otherwise
         */
        private static logicalOp(exitValue: boolean, ...conditions: PromiseFuncOrValue<boolean>[]): Q.Promise<boolean> {
            var args: PromiseFuncOrValue<boolean>[] = <PromiseFuncOrValue<boolean>[]>ArgsHelper.getOptionalArgsArrayFromFunctionCall(arguments, 1);
            return args.reduce(function(soFar: Q.Promise<boolean>, arg: () => Q.Promise<boolean>): Q.Promise<boolean> {
                return soFar.then(function(valueSoFar: boolean): Q.Promise<boolean> {
                    if (valueSoFar === exitValue) {
                        return Q(exitValue);
                    }
                    return PromisesUtils.getPromiseFunc(arg)();
                });
            }, Q(!exitValue));
        }

        private static getPromiseFunc<T>(promiseFuncOrVal: PromiseFuncOrValue<T>): () => Q.Promise<T> {
            if (typeof promiseFuncOrVal === "function") {
                return <() => Q.Promise<T>>promiseFuncOrVal;
            }
            return () => Q(<T>promiseFuncOrVal);
        }

    }
}

export = TacoUtility;
