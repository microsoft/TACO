/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */
// NOTE: This file is intended to run on-require, and print the logo, only once.
// We avoid using logger.log and other package dependencies because this is required in
// a couple of places including post-install, and we don't want to drag in all the infrastructure
var version = require("../package.json").version;

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
var lastLine = /*  align   */ "  /_/   /_/  |_|\\____/  \\____/   CLI v" + version;
console.log(logoColorFunction(lastLine));
console.log();

var len = lastLine.length;
var line = new Array(len + 1).join("-");
var title = "Tools for Apache Cordova";
var spaces = Math.floor((len - title.length) / 2);

console.log(logoColorFunction(line));
console.log(logoColorFunction(new Array(spaces + 1).join(" ") + title));
console.log(logoColorFunction(line));
console.log();
/* tslint:enable: no-console */
