import commands = require("./command");

export class Platform extends commands.Command{
    run() {
        console.log("Create!!!");
    }
}