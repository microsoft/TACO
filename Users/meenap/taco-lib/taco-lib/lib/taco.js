var createProject = require('./create');
var buildProject = require('./build');
var runProject = require('./run');
var platformHelper = require('./platform');
var taco;
(function (taco) {
    function create(dir, id, name, cfg) {
        return createProject.createProject(dir, id, name, cfg);
    }
    taco.create = create;
    function build(options) {
        return buildProject.buildProject(options);
    }
    taco.build = build;
    function compile(options) {
        return buildProject.buildProject(options);
    }
    taco.compile = compile;
    function prepare(options) {
        return buildProject.buildProject(options);
    }
    taco.prepare = prepare;
    function platform(command, targets, options) {
        return platformHelper.platformCommand(command, targets, options);
    }
    taco.platform = platform;
    function run(options) {
        return runProject.runProject(options);
    }
    taco.run = run;
    function emulate(options) {
        return runProject.emulateProject(options);
    }
    taco.emulate = emulate;
})(taco || (taco = {}));
module.exports = taco;
//# sourceMappingURL=taco.js.map