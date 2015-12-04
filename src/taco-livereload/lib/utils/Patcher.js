
/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

var helpers = require('./helpers');
var multiPlatforms = require('./platforms');
var url = require('url');
var path = require('path');
var promiseUtils = require('./promise-util');
var ATSRemover = require('./ATSRemover');
var CSPRemover = require('./CSPRemover');
var multiPlatforms = require('./platforms');

var fs = require('fs');

function Patcher(projectRoot, platforms) {
    this.startPage = helpers.GetStartPage(projectRoot);
    this.projectRoot = projectRoot;
    this.platforms = platforms;
};

/**
 * Patching - This is the process of removing anything that can prevent the mobile app from connecting to the BrowserSync server.
 * This function currently does the following for each platform:
 *    - Removes CSP (Content-Security-Policy) restrictions
 *    - Removes ATS (App Transport Security) in the case of iOS9+
 *    - Copies the homePage to the mobile app
 *    - Changes the start page of the app to the homePage
 * 
 * HomePage Role:
 *    - The homePage allows us to ping the BrowserSync server 
 *    - If we can't connect to the BrowserSync server, we display a meaningful error message to the user
 *    - If we can successfully connect to the BrowserSync server, we proceed with loading the app
 */
Patcher.prototype.patch = function (serverUrl) {
    var self = this;
    return promiseUtils.Q_chainmap(self.platforms, function (plat) {
        var platWWWFolder = multiPlatforms.getPlatformWWWFolder(plat);
        var platformIndexLocal = path.join(self.projectRoot, platWWWFolder, self.startPage);
        var cspRemover = new CSPRemover(platformIndexLocal);
        return cspRemover.Remove().then(function () {
            var atsRemover = new ATSRemover(self.projectRoot, plat);
            return atsRemover.Remove();
        }).then(function () {
            var platformIndexUrl = url.resolve(serverUrl, path.join(multiPlatforms.getPlatformWWWFolder(plat), self.startPage));
            return copyHomePage(self.projectRoot, plat, platformIndexUrl);
        }).then(function (homePage) {
            return helpers.ChangeStartPage(self.projectRoot, plat, homePage); 
        });
    });
};

Patcher.prototype.removeCSP = function () {
    var self = this;
    var startPage = helpers.GetStartPage(self.projectRoot);

    var platformWwws = self.platforms.map(function (plat) {
        return path.join(self.projectRoot, multiPlatforms.getPlatformWWWFolder(plat));
    });

    return platformWwws.forEach(function (platWWWDir) {
        var platformIndexLocal = path.join(platWWWDir, startPage);
        var remover = new CSPRemover(platformIndexLocal);
        remover.Remove();
    });
};

// Copy the homePage.html that comes with livereload into the platform's folder
function copyHomePage(projectRoot, platform, platformIndexUrl) {
    
    var HOME_PAGE = 'homePage.html'; 
    
    var src = path.join(__dirname, HOME_PAGE);
    
    var dest = path.join(projectRoot, multiPlatforms.getPlatformWWWFolder(platform), HOME_PAGE);
    
    // Append random string to the homePage.html filename being copied into the platforms folder 
    // ... so that it doesn't clash with potential user-defined homePage.html files
    var randomizedString = '_' + Math.random() + '.html';
    dest += randomizedString;
    
    // Copy from src to dest
    var srcContent = fs.readFileSync(src, 'utf-8');
    fs.writeFileSync(dest, srcContent.replace(/__SERVER_URL__/g, platformIndexUrl)); 
    
    return HOME_PAGE + randomizedString;
}

module.exports = Patcher;
