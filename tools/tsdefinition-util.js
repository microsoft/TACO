/// <reference path="../src/typings/node.d.ts" />
/// <reference path="../src/typings/Q.d.ts" />
/// <disable code="SA1301" justification="it is more standard to use 'Q'" />
var Q = require("q");
/// <enable code="SA1301" />
var exec = require("child_process").exec;
var fs = require("fs");
var path = require("path");
var del = require("del");
var ncp = require("ncp");
/*utility to generate .d.ts file*/
var DefinitionServices;
(function (DefinitionServices) {
    function generateTSExportDefinition(fileName, srcFolderPath, destFolderPath, moduleName, moduleString) {
        var destDtsFile = path.join(destFolderPath, fileName + ".d.ts");
        return Q(compileDeclarationFile(fileName, srcFolderPath)).then(function () {
            copyDTSTypings(fileName, srcFolderPath, destFolderPath);
        }).then(function () {
            addExportsInTypings(destDtsFile, moduleName, moduleString);
        });
    }
    DefinitionServices.generateTSExportDefinition = generateTSExportDefinition;
    /*call tsc --d, only option is to generate it in same folder as .ts*/
    function compileDeclarationFile(tsFileName, srcFolderPath) {
        var d = Q.defer();
        var srcTsFilePath = path.join(srcFolderPath, tsFileName + ".ts");
        var tscCommand = "tsc --d " + srcTsFilePath + " --module commonjs";
        console.log("---calling: " + tscCommand);
        exec(tscCommand, { cwd: "." }, function (error, stdout, stderr) {
            if (error) {
                return d.reject(error);
            }
            else {
                d.resolve(stdout);
            }
        });
        return d.promise;
    }
    function copyDTSTypings(tsFileName, srcFolderPath, destFolderPath) {
        var srcDTSFilePath = path.join(srcFolderPath, tsFileName + ".d.ts");
        var srcJSFilePath = path.join(srcFolderPath, tsFileName + ".js");
        var destDTSFilePath = path.join(destFolderPath, tsFileName + ".d.ts");
        console.log("copying: " + srcDTSFilePath + " to :" + destDTSFilePath);
        fs.writeFileSync(destDTSFilePath, fs.readFileSync(srcDTSFilePath));
        del([srcDTSFilePath], { force: true });
        del([srcJSFilePath], { force: true });
    }
    /*add wrap everything except ///<reference>s with "declare module "moduleString"{}"*/
    function addExportsInTypings(dtsPath, moduleName, moduleString) {
        console.log("---processing:  " + dtsPath);
        var buf = fs.readFileSync(dtsPath, "utf8");
        var result = buf.replace("declare module " + moduleName, "module " + moduleName);
        var regex = "(module " + moduleName + ")|(import)";
        var match = buf.match(regex);
        if (match && match[0]) {
            var foundMatch = match[0];
            result = result.replace(foundMatch, "declare module \"" + moduleString + "\" {\n" + foundMatch) + "\n}\n";
        }
        fs.writeFileSync(dtsPath, result, "utf8");
    }
})(DefinitionServices = exports.DefinitionServices || (exports.DefinitionServices = {}));
