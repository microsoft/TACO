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
    }
}
