/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

/// <reference path="../../../typings/node.d.ts"/>

"use strict";

/* This class can be used during a test, to capture the text sent to the console 
    (standard output), and then retrieve that content as text (probably for
    testing purposes).

    Sample usage:
import ms = require ("./utils/memoryStream");

    describe("Sample test set", function (): void {
        var stdoutWrite = process.stdout.write; // We save the original implementation, so we can restore it later
        var memoryStdout: ms.MemoryStream;

        beforeEach(() => {
            memoryStdout = new ms.MemoryStream; // Each individual test gets a new and empty console
            process.stdout.write = memoryStdout.writeAsFunction(); // We'll be printing into an "in-memory" console, so we can test the output
        });

        after(() => {
            // We just need to reset the stdout just once, after all the tests have finished
            process.stdout.write = stdoutWrite;
        });

        // Here you can write to the console with logger.log(...) and then you'll be able to 
        //    retrieve the contents from the memory stream
        it("execute one test", function (done: MochaDone): void {
                ...; // Run the test or command
                var expected = ...; // Get the expected console output
                var actual = memoryStdout.contentsAsText();
                actual.should.be.equal(expected);
        });
    });
*/

import stream = require ("stream");

export class MemoryStream extends stream.Writable {
    private fullBuffer: Buffer = new Buffer("");
    public _write(data: Buffer, encoding: string, callback: Function): void;
    public _write(data: string, encoding: string, callback: Function): void;
    public _write(data: any, encoding: string, callback: Function): void {
        var buffer = Buffer.isBuffer(data) ? data : new Buffer(data, encoding);
        this.fullBuffer = Buffer.concat([this.fullBuffer, buffer]);
        callback();
    }

    public contentsAsText(): string {
        var rawContents = this.fullBuffer.toString("utf-8");
        return rawContents.replace(/\r\n/g, "\n"); // We normalize the line endings
    }

    public writeAsFunction(): { (data: any, second: any, callback?: any): boolean } {
        return (data: any, second: any, callback?: any) => {
            if (typeof second === "string") {
                return this.write(data, second, callback);
            } else {
                return this.write(data, <Function>second);
            }
        };
    }
}
