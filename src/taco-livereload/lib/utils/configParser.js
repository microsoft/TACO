/**
 *******************************************************
 *                                                     *
 *   Copyright (C) Microsoft. All rights reserved.     *
 *                                                     *
 *******************************************************
 */

var et = require('elementtree');
var fs = require('fs');


function parseXml(filename) {
    return new et.ElementTree(et.XML(fs.readFileSync(filename, "utf-8").replace(/^\uFEFF/, "")));
}

// function getStartPage(configXML) {
//     var filename = configXML;
//     configXml = parseXml(filename);
//     var contentTag = configXml.find('content[@src]');
//     return contentTag && contentTag.attrib.src;
// };

//module.exports.getStartPage = getStartPage;

module.exports.GetStartPage = function(configXML) {
    var parsedConfigXML = parseXml(configXML);
    var contentTag = parsedConfigXML.find('content[@src]');
    return contentTag.attrib.src;
};

module.exports.GetProjectName = function(configXML) {
    var parsedConfigXML = parseXml(configXML);
    var nameTag = parsedConfigXML.find('name');
    return nameTag.text;
};
