/**
﻿ *******************************************************
﻿ *                                                     *
﻿ *   Copyright (C) Microsoft. All rights reserved.     *
﻿ *                                                     *
﻿ *******************************************************
﻿ */

var cheerio = require('cheerio');
var fs = require('fs');
var Q = require('q');
var path = require('path');

module.exports = function(indexHTMLPage) {

    this.indexHTMLPage = indexHTMLPage;
    this.indexHTMLContent = fs.readFileSync(this.indexHTMLPage, "utf-8");

    var self = this;
    this.Remove = function() {

        var deferred = Q.defer();

        var $ = cheerio.load(self.indexHTMLContent);
        $("meta[http-equiv=Content-Security-Policy]").remove(); // what if csp is in lower character ? 	

        var newHtmlContent = $.html(); // HTML content with CSP directives removed

        // Override file with new content by first performing a deletion followed by creating a new file because of a weird bug 
        //   ... where sometimes fs.writeFile(..) doesn't override file content with new text on OSX
        fs.unlink(self.indexHTMLPage, function(err) {
            if (err) {
                deferred.reject(err);
            }

            fs.writeFile(self.indexHTMLPage, newHtmlContent, function(err) {
                if (err) {
                    deferred.reject(err);
                }
                deferred.resolve();
            });

        });

        return deferred.promise;
    };
};
