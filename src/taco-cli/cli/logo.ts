/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */
// NOTE: This file is intended to run on-require, and print the logo, only once.
import colors = require ("colors/safe");
var version = require("../package.json").version;

var logoColorFunction = colors.yellow;

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