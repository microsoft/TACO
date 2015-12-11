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
        public static install(packageId: string, workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any>;

		public static view(packageId: string, fields?: string[], workingDirectory?: string, commandFlags?: string[], logLevel?: InstallLogLevel): Q.Promise<any>;
    }
}
