/// <reference path="../Scripts/typings/mocha/mocha.d.ts" />
/// <reference path="../Scripts/typings/node/node.d.ts" />
var should_module = require('should'); // Note not import: We don't want to refer to should_module, but we need the require to occur since it modifies the prototype of Object.

describe("Sample Test", function () {
    describe("Sub-test", function () {
        it("should be a good example of a test case", function () {
            var x : number = 1 + 1;
            x.should.equal(2);
        });
    });
});