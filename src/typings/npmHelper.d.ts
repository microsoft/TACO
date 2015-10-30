/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/installLogLevel.d.ts" />
/// <reference path="../typings/q.d.ts" />
declare module TacoUtility {
    class NpmHelper {
        public static install(args: string[], path: string, logLevel?: InstallLogLevel): Q.Promise<any>;
		
		public static view(args: string[], path: string, logLevel?: InstallLogLevel): Q.Promise<any>;
    }
}