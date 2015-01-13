/// <reference path="node.d.ts" />
var __extends = this.__extends || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    __.prototype = b.prototype;
    d.prototype = new __();
};
var assert = require("assert");
var fs = require("fs");
var events = require("events");
var zlib = require("zlib");
var url = require('url');
var util = require("util");
var crypto = require("crypto");
var http = require("http");
var net = require("net");
var dgram = require("dgram");
assert(1 + 1 - 2 === 0, "The universe isn't how it should.");
assert.deepEqual({ x: { y: 3 } }, { x: { y: 3 } }, "DEEP WENT DERP");
assert.equal(3, "3", "uses == comparator");
assert.notStrictEqual(2, "2", "uses === comparator");
assert.throws(function () {
    throw "a hammer at your face";
}, undefined, "DODGED IT");
assert.doesNotThrow(function () {
    if (false) {
        throw "a hammer at your face";
    }
}, undefined, "What the...*crunch*");
////////////////////////////////////////////////////
/// File system tests : http://nodejs.org/api/fs.html
////////////////////////////////////////////////////
fs.writeFile("thebible.txt", "Do unto others as you would have them do unto you.", assert.ifError);
fs.writeFile("Harry Potter", "\"You be wizzing, Harry,\" jived Dumbledore.", {
    encoding: "ascii"
}, assert.ifError);
var content, buffer;
content = fs.readFileSync('testfile', 'utf8');
content = fs.readFileSync('testfile', { encoding: 'utf8' });
buffer = fs.readFileSync('testfile');
buffer = fs.readFileSync('testfile', { flag: 'r' });
fs.readFile('testfile', 'utf8', function (err, data) { return content = data; });
fs.readFile('testfile', { encoding: 'utf8' }, function (err, data) { return content = data; });
fs.readFile('testfile', function (err, data) { return buffer = data; });
fs.readFile('testfile', { flag: 'r' }, function (err, data) { return buffer = data; });
var Networker = (function (_super) {
    __extends(Networker, _super);
    function Networker() {
        _super.call(this);
        this.emit("mingling");
    }
    return Networker;
})(events.EventEmitter);
////////////////////////////////////////////////////
/// Url tests : http://nodejs.org/api/url.html
////////////////////////////////////////////////////
url.format(url.parse('http://www.example.com/xyz'));
// https://google.com/search?q=you're%20a%20lizard%2C%20gary
url.format({
    protocol: 'https',
    host: "google.com",
    pathname: 'search',
    query: { q: "you're a lizard, gary" }
});
var helloUrl = url.parse('http://example.com/?hello=world', true);
assert.equal(helloUrl.query.hello, 'world');
// Old and new util.inspect APIs
util.inspect(["This is nice"], false, 5);
util.inspect(["This is nice"], { colors: true, depth: 5, customInspect: false });
////////////////////////////////////////////////////
/// Stream tests : http://nodejs.org/api/stream.html
////////////////////////////////////////////////////
// http://nodejs.org/api/stream.html#stream_readable_pipe_destination_options
function stream_readable_pipe_test() {
    var r = fs.createReadStream('file.txt');
    var z = zlib.createGzip();
    var w = fs.createWriteStream('file.txt.gz');
    r.pipe(z).pipe(w);
    r.close();
}
////////////////////////////////////////////////////
/// Crypto tests : http://nodejs.org/api/crypto.html
////////////////////////////////////////////////////
var hmacResult = crypto.createHmac('md5', 'hello').update('world').digest('hex');
function crypto_cipher_decipher_string_test() {
    var key = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7]);
    var clearText = "This is the clear text.";
    var cipher = crypto.createCipher("aes-128-ecb", key);
    var cipherText = cipher.update(clearText, "utf8", "hex");
    cipherText += cipher.final("hex");
    var decipher = crypto.createDecipher("aes-128-ecb", key);
    var clearText2 = decipher.update(cipherText, "hex", "utf8");
    clearText2 += decipher.final("utf8");
    assert.equal(clearText2, clearText);
}
function crypto_cipher_decipher_buffer_test() {
    var key = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 1, 2, 3, 4, 5, 6, 7]);
    var clearText = new Buffer([1, 2, 3, 4, 5, 6, 7, 8, 9, 8, 7, 6, 5, 4]);
    var cipher = crypto.createCipher("aes-128-ecb", key);
    var cipherBuffers = [];
    cipherBuffers.push(cipher.update(clearText));
    cipherBuffers.push(cipher.final());
    var cipherText = Buffer.concat(cipherBuffers);
    var decipher = crypto.createDecipher("aes-128-ecb", key);
    var decipherBuffers = [];
    decipherBuffers.push(decipher.update(cipherText));
    decipherBuffers.push(decipher.final());
    var clearText2 = Buffer.concat(decipherBuffers);
    assert.deepEqual(clearText2, clearText);
}
////////////////////////////////////////////////////
// Make sure .listen() and .close() retuern a Server instance
http.createServer().listen(0).close().address();
net.createServer().listen(0).close().address();
var request = http.request('http://0.0.0.0');
request.once('error', function () {
});
request.setNoDelay(true);
request.abort();
////////////////////////////////////////////////////
/// Http tests : http://nodejs.org/api/http.html
////////////////////////////////////////////////////
var http_tests;
(function (http_tests) {
    // Status codes
    var code = 100;
    var codeMessage = http.STATUS_CODES['400'];
    var codeMessage = http.STATUS_CODES[400];
})(http_tests || (http_tests = {}));
////////////////////////////////////////////////////
/// Dgram tests : http://nodejs.org/api/dgram.html
////////////////////////////////////////////////////
var ds = dgram.createSocket("udp4", function (msg, rinfo) {
});
var ai = ds.address();
ds.send(new Buffer("hello"), 0, 5, 5000, "127.0.0.1", function (error, bytes) {
});
//# sourceMappingURL=node-tests.js.map