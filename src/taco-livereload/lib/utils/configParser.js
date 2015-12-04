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

module.exports.ChangeStartPage = function(hostedPage, configXML) {
    var xml = parseXml(configXML);
    var contentTag = xml.find('content[@src]');
    if (contentTag) {
        contentTag.attrib.src = hostedPage;
    }
    // Also add allow nav in case of 
    var allowNavTag = et.SubElement(xml.find('.'), 'allow-navigation');
    allowNavTag.set('href', '*');
    fs.writeFileSync(configXML, xml.write({
        indent: 4
    }), "utf-8");
    return configXML;
};

module.exports.GetStartPage = function(configXML) {
    var parsedConfigXML = parseXml(configXML);
    var contentTag = parsedConfigXML.find('content[@src]');
    return contentTag.attrib.src;
};
