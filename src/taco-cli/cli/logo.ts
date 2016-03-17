// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for details.

// NOTE: This file is intended to run on-require, and print the logo, only once.
// We avoid using logger.log and other package dependencies because this is required in
// a couple of places including post-install, and we don't want to drag in all the infrastructure

/* tslint:disable:no-var-requires */
// var require needed to require package json
var version: string = require("../package.json").version;
/* tslint:enable:no-var-requires */

function logoColorFunction(s: string): string {
    // https://en.wikipedia.org/wiki/ANSI_escape_code#CSI_codes
    // \u001b[3Xm == "set foreground colour to colour in slot X"
    // Slot 3 defaults to yellow
    // \u001b[39m == "reset foreground colour"
    // \u001b[1m == "bold" which is interpreted differently by different terminals
    // \u001b[22m == "stop being bold (or faint)"
    return "\u001b[33m\u001b[1m" + s + "\u001b[22m\u001b[39m";
}

/* tslint:disable: no-console */
console.log(logoColorFunction("  _____________________________"));
console.log(logoColorFunction("  ___  __/_    |__  ____/_  __ \\"));
console.log(logoColorFunction("  __  /  _  /| |_  /    _  / / /"));
console.log(logoColorFunction("  _  /  _  ___ |/ /___  / /_/ /"));
var lastLine: string = /*  */ "  /_/   /_/  |_|\\____/  \\____/   CLI v" + version;
console.log(logoColorFunction(lastLine));
console.log();

var len: number = lastLine.length;
var line: string = new Array(len + 1).join("-");
var title: string = "Tools for Apache Cordova";
var spaces: number = Math.floor((len - title.length) / 2);

console.log(logoColorFunction(line));
console.log(logoColorFunction(new Array(spaces + 1).join(" ") + title));
console.log(logoColorFunction(line));
console.log();
/* tslint:enable: no-console */
