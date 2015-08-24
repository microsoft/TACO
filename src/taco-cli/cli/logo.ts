/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */
// NOTE: This file is intended to run on-require, and print the logo, only once.
var version = require("../package.json").version;

console.log("  _____________________________");
console.log("  ___  __/_    |__  ____/_  __ \\");
console.log("  __  /  _  /| |_  /    _  / / /");
console.log("  _  /  _  ___ |/ /___  / /_/ /");
var lstLn = "  /_/   /_/  |_|\\____/  \\____/   CLI v" + version;
console.log(lstLn);
console.log();

var len = lstLn.length;
var line = new Array(len + 1).join("-");
var title = "Tools for Apache Cordova";
var spaces = Math.floor((len - title.length) / 2);

console.log(line);
console.log(new Array(spaces + 1).join(" ") + title);
console.log(line);
