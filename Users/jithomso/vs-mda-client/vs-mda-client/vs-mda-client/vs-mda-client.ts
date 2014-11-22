import remoteBuild = require("./lib/remoteBuild");
import BuildSettings = require("./lib/BuildSettings");
import Q = require("q");

var settings = new BuildSettings(process.cwd());

Q(remoteBuild.build(settings)).done()