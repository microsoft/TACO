/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoTestsUtils {
    class TacoErrorTestHelper {
        public static verifyTacoErrors(fileName: string, resources: any, minErrorCode: number, maxErrorCode: number): void;
        public static verifyExcludedTacoErrors(fileName: string, resources: any, excludedErrorCodes: number[]): void;
    }
}

