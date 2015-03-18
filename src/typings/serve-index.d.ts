// Barebones typing for serve-index

declare module "serve-index" {
    import express = require("express");

    function serveIndex(rootPath: string): express.RequestHandler;
    export = serveIndex;
}