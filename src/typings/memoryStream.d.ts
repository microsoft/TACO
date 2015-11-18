/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

/// <reference path="../typings/node.d.ts" />

declare module TacoTestsUtils {
    class MemoryStream extends NodeJSStream.Writable {
		public _write(data: Buffer, encoding: string, callback: Function): void;
		public _write(data: string, encoding: string, callback: Function): void;
		public _write(data: any, encoding: string, callback: Function): void;
		
        public contentsAsText(): string;
        public writeAsFunction(): { (data: any, second: any, callback?: any): boolean };
    }
}
